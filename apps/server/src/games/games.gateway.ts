import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GamesService } from './games.service';
import { RoomsService } from '../rooms/rooms.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Team, RoomStatus } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  playerId?: string;
  roomId?: string;
  nickname?: string;
  team?: Team;
  isHost?: boolean; // Host(observer)인지 여부
}

@WebSocketGateway({
  cors: {
    origin: '*', // 프로덕션에서는 특정 도메인으로 제한
  },
  namespace: '/game',
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private gameStartTime: Map<string, Date> = new Map();
  private gamePlayerIds: Map<string, string[]> = new Map(); // roomId -> playerIds
  // CASTING 단계에서 서버 주도 카운트다운 완료 후에만 캐스팅을 허용하기 위한 플래그
  // roomId -> casting window open 여부
  private castingWindowOpen: Map<string, boolean> = new Map();

  // Host heartbeat tracking: roomId -> last heartbeat timestamp
  private hostHeartbeat: Map<string, number> = new Map();
  private readonly HEARTBEAT_TIMEOUT_MS = 60 * 1000; // 1분
  private heartbeatCleanupInterval: NodeJS.Timeout | null = null;
  // Casting completion tracking: roomId:team -> boolean
  private castingComplete: Map<string, boolean> = new Map();

  // Helper method to broadcast current room state to all clients in the room
  private async broadcastRoomState(roomId: string) {
    const room = await this.roomsService.getRoomById(roomId);
    const playerIds = room.players.map(p => p.id);

    const [readyStates, playerScores, teamScores] = await Promise.all([
      Promise.all(
        playerIds.map(async (id) => ({
          playerId: id,
          isReady: await this.redis.getPlayerReady(roomId, id),
          sensorChecked: await this.redis.getSensorChecked(roomId, id),
        })),
      ),
      this.redis.getAllPlayerScores(roomId, playerIds),
      this.redis.getTeamScores(roomId),
    ]);

    const roomStateData = {
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        teamAName: room.teamAName,
        teamBName: room.teamBName,
      },
      teamScores: {
        A: teamScores.A || 0,
        B: teamScores.B || 0,
      },
      players: room.players.map(p => ({
        id: p.id,
        nickname: (p as any).nickname,
        profileImage: (p as any).profileImage,
        team: p.team,
        isLeader: (p as any).isLeader,
        score: playerScores.get(p.id) || 0,
        ...readyStates.find(rs => rs.playerId === p.id),
      })),
    };

    this.server.to(roomId).emit('room_state', roomStateData);
  }

  constructor(
    private gamesService: GamesService,
    private roomsService: RoomsService,
    private redis: RedisService,
    private authService: AuthService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    // 30초마다 비활성 Host 게임 체크 및 정리
    this.heartbeatCleanupInterval = setInterval(() => {
      this.cleanupInactiveGames();
    }, 30 * 1000);
    console.log('[GamesGateway] 🔄 Heartbeat cleanup interval started');
  }

  onModuleDestroy() {
    if (this.heartbeatCleanupInterval) {
      clearInterval(this.heartbeatCleanupInterval);
      this.heartbeatCleanupInterval = null;
      console.log('[GamesGateway] 🛑 Heartbeat cleanup interval stopped');
    }
  }

  // 비활성 게임 정리 (Host heartbeat 타임아웃)
  private async cleanupInactiveGames() {
    const now = Date.now();
    const inactiveRooms: string[] = [];

    this.hostHeartbeat.forEach((lastHeartbeat, roomId) => {
      if (now - lastHeartbeat > this.HEARTBEAT_TIMEOUT_MS) {
        inactiveRooms.push(roomId);
      }
    });

    for (const roomId of inactiveRooms) {
      try {
        console.log(`[GamesGateway] ⏰ Host timeout for room ${roomId}, terminating game...`);
        await this.terminateGame(roomId, 'host_timeout');
        this.hostHeartbeat.delete(roomId);
      } catch (error) {
        console.error(`[GamesGateway] ❌ Failed to cleanup room ${roomId}:`, error);
      }
    }
  }

  // 게임 강제 종료 헬퍼
  private async terminateGame(roomId: string, reason: string) {
    try {
      const room = await this.roomsService.getRoomById(roomId);

      // 이미 FINISHED 상태면 스킵
      if (room.status === RoomStatus.FINISHED) {
        return;
      }

      // 상태를 FINISHED로 변경
      await this.roomsService.updateRoomStatus(roomId, RoomStatus.FINISHED);

      // 모든 클라이언트에 게임 종료 알림
      this.server.to(roomId).emit('game_terminated', {
        reason,
        message: reason === 'host_timeout'
          ? '호스트 연결이 끊어져 게임이 종료되었습니다.'
          : '호스트가 게임을 종료했습니다.',
      });

      // 관련 상태 정리
      this.gameStartTime.delete(roomId);
      this.gamePlayerIds.delete(roomId);
      this.castingWindowOpen.delete(roomId);

      console.log(`[GamesGateway] 🏁 Game terminated: ${roomId}, reason: ${reason}`);
    } catch (error) {
      console.error(`[GamesGateway] ❌ terminateGame error:`, error);
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 토큰 검증 (handshake에서 토큰 전달)
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // 1. 환경 변수에서 개발 모드 설정 로드
      const isDevAuthEnabled = this.configService.get<string>('DEV_AUTH_ENABLED') === 'true';
      const devAuthToken = this.configService.get<string>('DEV_AUTH_TOKEN') || 'dev-token';

      let user;

      // 2. 개발용 토큰 체크 로직 추가
      // JWT(ey...)가 아닌 경우에만 dev token 체크를 수행하여 불필요한 로그 방지
      if (isDevAuthEnabled && !token.startsWith('ey') && token.startsWith(devAuthToken)) {
        console.log(`🚀 [Dev Mode] WebSocket Bypass for token: ${token}`);
        user = await this.authService.getOrCreateDevUser(token);
      } else {
        // 3. Custom JWT Token 검증 (Google ID Token 아님)
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          });
          // payload.sub contains userId
          user = { id: payload.sub, nickname: payload.nickname };
        } catch (e) {
          console.error('Invalid JWT Token:', e.message);
          client.disconnect();
          return;
        }
      }

      if (!user) {
        console.error(`Connection failed: User not found for token`);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      console.log(`Client connected: ${client.id}, userId: ${user.id}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);

    // Host(observer)가 연결 해제된 경우 - 별도 처리 없음
    if (client.isHost) {
      console.log(`[Gateway] Host (observer) disconnected from room: ${client.roomId}`);
      return;
    }

    if (client.roomId && client.playerId) {
      // 리더 위임 로직
      const room = await this.roomsService.getRoomById(client.roomId);
      const player = room.players.find(p => p.id === client.playerId);

      if (player && (player as any).isLeader && player.team) {
        const newLeader = await this.roomsService.delegateLeader(client.roomId, player.team, player.id);
        if (newLeader) {
          // Redis 상태 업데이트
          await Promise.all([
            this.redis.setTeamLeader(client.roomId, player.id, false),
            this.redis.setTeamLeader(client.roomId, newLeader.id, true),
          ]);

          this.server.to(client.roomId).emit('leader_updated', {
            team: player.team,
            newLeaderId: newLeader.id,
            nickname: (newLeader as any).nickname // Player 테이블의 고정된 닉네임
          });
        }
      }

      this.server.to(client.roomId).emit('player_disconnected', {
        playerId: client.playerId,
      });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; playerId?: string },
  ) {
    const { roomId, playerId } = data;

    // 현재 방 상태 전송
    const room = await this.roomsService.getRoomById(roomId);

    // Host(observer)인지 Player인지 확인
    const isHost = room.hostId === client.userId;

    client.roomId = roomId;
    client.isHost = isHost;
    client.join(roomId);

    if (isHost) {
      // Host는 Observer - 게임을 관전하는 역할
      const hostRoom = `${roomId}_host`;
      if (!client.rooms.has(hostRoom)) {
        client.join(hostRoom);
        console.log(`[Gateway] Host (observer) joined room: ${roomId}`);
      }
      // Host heartbeat 초기화
      this.hostHeartbeat.set(roomId, Date.now());
    } else {
      // Player 입장
      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        console.warn(`[Gateway] Player not found: ${playerId}`);
        return;
      }

      client.playerId = playerId;
      client.nickname = (player as any).nickname; // Player 테이블의 고정된 닉네임
      client.team = player.team || undefined;

      // 방의 다른 사람들에게 알림 (기본 정보 포함)
      client.to(roomId).emit('player_joined', {
        playerId,
        id: playerId, // PC 클라이언트 호환성
        nickname: (player as any).nickname,
        profileImage: (player as any).profileImage,
        team: player.team || null,
        isLeader: (player as any).isLeader || false,
      });
    }

    const playerIds = room.players.map(p => p.id);

    // Redis에서 실시간 상태 가져오기
    const [readyStates, playerScores, teamScores] = await Promise.all([
      Promise.all(
        playerIds.map(async (id) => ({
          playerId: id,
          isReady: await this.redis.getPlayerReady(roomId, id),
          sensorChecked: await this.redis.getSensorChecked(roomId, id),
        })),
      ),
      this.redis.getAllPlayerScores(roomId, playerIds),
      this.redis.getTeamScores(roomId), // 팀 점수 조회 추가
    ]);

    // room_state 데이터 구성 - Player 테이블의 고정된 닉네임 사용
    const roomStateData = {
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        teamAName: room.teamAName,
        teamBName: room.teamBName,
      },
      // 팀 점수 (PLAYING/FINISHED 상태에서 재접속 시 점수 동기화용)
      teamScores: {
        A: teamScores.A || 0,
        B: teamScores.B || 0,
      },
      players: room.players.map(p => ({
        id: p.id,
        nickname: (p as any).nickname, // Player 테이블의 고정된 닉네임
        // Player.profileImage가 없을 경우 User.profileImage를 fallback으로 사용
        profileImage: (p as any).profileImage || (p as any).user?.profileImage || null,
        team: p.team,
        isLeader: (p as any).isLeader,
        score: playerScores.get(p.id) || 0,
        ...readyStates.find(rs => rs.playerId === p.id),
      })),
    };

    // 새로 입장한 클라이언트에게 전송
    client.emit('room_state', roomStateData);

    // Player 입장 시 전체 방에 브로드캐스트 (Host 입장은 브로드캐스트 불필요)
    if (!isHost) {
      this.server.to(roomId).emit('room_state', roomStateData);
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.roomId && client.playerId) {
      client.leave(client.roomId);
      client.to(client.roomId).emit('player_left', { playerId: client.playerId });
    }
  }

  // Host heartbeat - 연결 유지 확인
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId, isHost } = client;
    if (!roomId || !isHost) return;

    this.hostHeartbeat.set(roomId, Date.now());
    client.emit('heartbeat_ack');
  }

  // Host가 게임 종료 (PLAYING 상태가 아닐 때만)
  @SubscribeMessage('terminate_game')
  async handleTerminateGame(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId, isHost } = client;
    if (!roomId || !isHost) {
      client.emit('terminate_error', { message: '권한이 없습니다.' });
      return;
    }

    try {
      const room = await this.roomsService.getRoomById(roomId);

      // PLAYING 상태에서는 종료 불가
      if (room.status === RoomStatus.PLAYING) {
        client.emit('terminate_error', {
          message: '게임 진행 중에는 종료할 수 없습니다. 게임이 끝날 때까지 기다려주세요.',
        });
        return;
      }

      await this.terminateGame(roomId, 'host_terminated');
      this.hostHeartbeat.delete(roomId);
    } catch (error) {
      console.error('[GamesGateway] ❌ terminate_game error:', error);
      client.emit('terminate_error', { message: '게임 종료 중 오류가 발생했습니다.' });
    }
  }

  @SubscribeMessage('delegate_leader')
  async handleDelegateLeader(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { newLeaderId: string },
  ) {
    const { roomId, playerId, team } = client;
    if (!roomId || !playerId || !team) return;

    // 현재 요청자가 리더인지 확인 필요
    const room = await this.roomsService.getRoomById(roomId);
    const currentPlayer = room.players.find(p => p.id === playerId);

    if (!currentPlayer || !(currentPlayer as any).isLeader) {
        return; // 권한 없음
    }

    // 새로운 리더가 같은 팀인지 확인
    const newLeaderPlayer = room.players.find(p => p.id === data.newLeaderId);
    if (!newLeaderPlayer || newLeaderPlayer.team !== team) {
        return; // 유효하지 않은 대상
    }

    await this.roomsService.changeLeader(roomId, team, playerId, data.newLeaderId);

    // Redis 상태도 업데이트 (게임 로직용)
    await Promise.all([
      this.redis.setTeamLeader(roomId, playerId, false),
      this.redis.setTeamLeader(roomId, data.newLeaderId, true),
    ]);

    this.server.to(roomId).emit('leader_updated', {
      team,
      newLeaderId: data.newLeaderId,
      nickname: (newLeaderPlayer as any).nickname // Player 테이블의 고정된 닉네임
    });
  }

  @SubscribeMessage('select_team')
  async handleSelectTeam(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { team: Team | null },
  ) {
    const { roomId, playerId } = client;
    if (!roomId || !playerId) return;

    try {
      // room의 maxPlayers를 가져와야 함. 
      // 최적화를 위해 Redis에 저장된 값을 쓰거나, DB에서 해당 필드만 조회하는 것이 좋음.
      // 현재는 RedisService에 관련 메서드가 없으므로, RoomsService의 selectTeam 호출 시 
      // 기본값 10을 사용하거나, 필요하다면 캐싱된 값을 사용하도록 개선 필요.
      // 여기서는 일단 기본값 10으로 호출하고, 추후 Room 생성 시 Redis에 maxPlayers 저장 권장.
      
      const player = await this.roomsService.selectTeam(roomId, playerId, data.team, 10);
      client.team = player.team || undefined;

      // 팀 선택 시 리더 여부도 업데이트 (Redis 및 클라이언트 알림)
      if (player.isLeader) {
          await this.redis.setTeamLeader(roomId, playerId, true);
      }

      this.server.to(roomId).emit('player_updated', {
        playerId,
        team: player.team,
        isLeader: player.isLeader, // 리더 여부 추가 전송
      });
    } catch (error) {
      if (error.message && error.message.includes('is full')) {
         client.emit('team_full', {
          team: data.team,
          maxPlayers: 10, // Default fallback
          message: error.message,
        });
      } else {
        console.error('[Gateway] select_team error:', error);
      }
    }
  }

  @SubscribeMessage('toggle_ready')
  async handleToggleReady(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId, playerId } = client;
    if (!roomId || !playerId) return;

    const currentReady = await this.redis.getPlayerReady(roomId, playerId);
    await this.redis.setPlayerReady(roomId, playerId, !currentReady);

    this.server.to(roomId).emit('player_updated', {
      playerId,
      isReady: !currentReady,
    });

    // 모든 플레이어 준비 확인 (Host는 Player가 아니므로 필터링 불필요)
    const room = await this.roomsService.getRoomById(roomId);
    const playerIds = room.players.map(p => p.id);

    // 플레이어가 2명 이상일 때만 시작
    if (playerIds.length >= 2) {
      // 각 팀에 적어도 한 명씩은 있는지 확인
      const teamAPlayers = room.players.filter(p => p.team === Team.A);
      const teamBPlayers = room.players.filter(p => p.team === Team.B);

      if (teamAPlayers.length > 0 && teamBPlayers.length > 0) {
        const allReady = await this.redis.areAllPlayersReady(roomId, playerIds);
        if (allReady) {
          // 양 팀 인원이 같은지 확인
          if (teamAPlayers.length !== teamBPlayers.length) {
            this.server.to(roomId).emit('team_imbalance', {
              teamACount: teamAPlayers.length,
              teamBCount: teamBPlayers.length,
              message: '양 팀의 인원 수가 같아야 게임을 시작할 수 있습니다.',
            });
            return;
          }
          this.server.to(roomId).emit('all_ready');
        }
      }
    }
  }

  @SubscribeMessage('sensor_checked')
  async handleSensorChecked(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId, playerId } = client;
    if (!roomId || !playerId) return;

    await this.redis.setSensorChecked(roomId, playerId, true);

    this.server.to(roomId).emit('player_updated', {
      playerId,
      sensorChecked: true,
    });

    // 모든 플레이어 센서 확인 완료 체크 (Host는 Player가 아니므로 필터링 불필요)
    const room = await this.roomsService.getRoomById(roomId);
    const playerIds = room.players.map(p => p.id);

    if (playerIds.length > 0) {
      const allChecked = await this.redis.areAllSensorChecked(roomId, playerIds);
      if (allChecked) {
        this.server.to(roomId).emit('all_sensor_checked');
      }
    }
  }

  @SubscribeMessage('start_cinematic')
  async handleStartCinematic(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { roomId } = client;
    if (!roomId) return;

    await this.roomsService.updateRoomStatus(roomId, (RoomStatus as any).CINEMATIC);
    await this.broadcastRoomState(roomId);
    this.server.to(roomId).emit('cinematic_started');
  }

  @SubscribeMessage('start_tutorial')
  async handleStartTutorial(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { roomId } = client;
    if (!roomId) return;

    await this.roomsService.updateRoomStatus(roomId, (RoomStatus as any).TUTORIAL);
    await this.broadcastRoomState(roomId);
    this.server.to(roomId).emit('tutorial_started');
  }

  @SubscribeMessage('select_leaders')
  async handleSelectLeaders(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId } = client;
    if (!roomId) return;

    const leaders = await this.gamesService.selectTeamLeaders(roomId);

    this.server.to(roomId).emit('leaders_selected', leaders);
  }

  @SubscribeMessage('start_casting')
  async handleStartCasting(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId } = client;
    if (!roomId) return;

    await this.roomsService.updateRoomStatus(roomId, (RoomStatus as any).CASTING);
    await this.broadcastRoomState(roomId);
    this.server.to(roomId).emit('casting_phase');
  }

  @SubscribeMessage('start_casting_timer')
  async handleStartCastingTimer(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId } = client;
    if (!roomId) return;

    // TODO: 필요 시 RoomStatus.CASTING 여부를 검사하여 오남용 방지
    console.log('[Gateway] start_casting_timer received for room:', roomId);
    this.castingWindowOpen.set(roomId, false);

    let count = 5;

    const interval = setInterval(() => {
      // 1~5 카운트다운 브로드캐스트
      if (count > 0) {
        this.server.to(roomId).emit('casting_countdown', { count });
        console.log('[Gateway] casting_countdown:', { roomId, count });
        count -= 1;
        return;
      }

      // 0이 된 시점: casting_start 신호 후 타이머 종료
      this.server.to(roomId).emit('casting_start');
      this.castingWindowOpen.set(roomId, true);
      console.log('[Gateway] casting_start emitted for room:', roomId);
      clearInterval(interval);
    }, 1000);
  }

  @SubscribeMessage('cast_action')
  async handleCastAction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { power: number },
  ) {
    const { roomId, playerId, team } = client;
    if (!roomId || !playerId || !team) return;

    // 서버 주도 카운트다운이 끝나지 않았다면 캐스팅 무시
    const isWindowOpen = this.castingWindowOpen.get(roomId);
    if (!isWindowOpen) {
      console.warn(
        '[Gateway] cast_action ignored: casting window not open',
        { roomId, playerId, team, power: data?.power },
      );
      return;
    }

    // 팀장인지 확인
    const isLeader = await this.redis.getTeamLeader(roomId, playerId);
    if (!isLeader) return;

    // Power 값은 모바일에서 0~100 범위로 정규화되어 오므로
    // 서버에서는 그대로 중계하되, 방어적으로 클램핑 (0~100)
    const rawPower = typeof data.power === 'number' ? data.power : 0;
    const clampedPower = Math.max(0, Math.min(rawPower, 100));

    console.log('[Gateway] cast_action received:', {
      roomId,
      playerId,
      team,
      rawPower,
      clampedPower,
    });

    this.server.to(roomId).emit('cast_result', {
      team,
      power: clampedPower,
    });
  }

  @SubscribeMessage('cast_complete')
  async handleCastComplete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { team: Team },
  ) {
    const { roomId } = client;
    if (!roomId) return;

    this.server.to(roomId).emit('team_casted', { team: data.team });
    
    // 현재 팀 캐스팅 완료 표시
    const teamKey = `${roomId}:${data.team}`;
    this.castingComplete.set(teamKey, true);
    
    // 양 팀 모두 캐스팅 완료 확인
    const teamAKey = `${roomId}:A`;
    const teamBKey = `${roomId}:B`;
    const teamACasted = this.castingComplete.get(teamAKey);
    const teamBCasted = this.castingComplete.get(teamBKey);
    
    // 양 팀 모두 완료 시 5초 대기 후 HIT 신호
    if (teamACasted && teamBCasted) {
      console.log(`[Gateway] Both teams casted in room ${roomId}, starting 5s timer for HIT`);
      
      // 5초 대기 후 HIT 신호 전송
      setTimeout(() => {
        this.server.to(roomId).emit('casting_hit');
        console.log(`[Gateway] casting_hit emitted for room ${roomId}`);
        
        // 캐스팅 완료 상태 초기화
        this.castingComplete.delete(teamAKey);
        this.castingComplete.delete(teamBKey);
      }, 5000);
    }
  }

  @SubscribeMessage('start_countdown')
  async handleStartCountdown(@ConnectedSocket() client: AuthenticatedSocket) {
    const { roomId } = client;
    if (!roomId) return;

    // 10초 카운트다운
    let count = 10;
    const interval = setInterval(() => {
      this.server.to(roomId).emit('countdown', { count });
      count--;

      if (count < 0) {
        clearInterval(interval);
        this.startGame(roomId);
      }
    }, 1000);
  }

  private async startGame(roomId: string) {
    const room = await this.roomsService.getRoomById(roomId);
    const playerIds = room.players.map(p => p.id);

    // 게임 시작 시 플레이어 목록 저장
    this.gamePlayerIds.set(roomId, playerIds);

    // 모든 플레이어 점수 초기화
    await this.redis.resetAllPlayerScores(roomId, playerIds);

    // 팀 인원 수 기반 goalScore 설정 (한 팀 인원 * 50)
    const teamACount = room.players.filter(p => p.team === Team.A).length;
    const goalScore = teamACount * 50;
    await this.redis.setGoalScore(roomId, goalScore);

    await this.gamesService.startGame(roomId);
    this.gameStartTime.set(roomId, new Date());

    await this.broadcastRoomState(roomId);
    this.server.to(roomId).emit('game_started');
  }

  private async endGame(roomId: string, winnerTeam: Team) {
    const startedAt = this.gameStartTime.get(roomId) || new Date();
    const playerIds = this.gamePlayerIds.get(roomId) || [];
    const result = await this.gamesService.endGame(roomId, startedAt);

    // 개인 점수도 포함
    const playerScores = await this.redis.getAllPlayerScores(roomId, playerIds);
    const room = await this.roomsService.getRoomById(roomId);

    // MVP 계산 (가장 높은 점수)
    let mvpPlayerId: string | null = null;
    let maxScore = 0;
    playerScores.forEach((score, id) => {
      if (score > maxScore) {
        maxScore = score;
        mvpPlayerId = id;
      }
    });

    const mvpPlayer = room.players.find(p => p.id === mvpPlayerId);

    // 랜덤 아이템 선택 (프론트엔드에서 아이템 목록 정의)
    const ITEM_COUNT = 10; // 프론트엔드 아이템 목록 개수와 일치해야 함
    const caughtItemIndex = Math.floor(Math.random() * ITEM_COUNT);

    this.server.to(roomId).emit('game_ended', {
      winnerTeam,
      teamScores: result.scores,
      caughtItemIndex, // 낚은 아이템 인덱스
      playerScores: room.players.map(p => ({
        playerId: p.id,
        nickname: (p as any).nickname, // Player 테이블의 고정된 닉네임
        team: p.team,
        score: playerScores.get(p.id) || 0,
      })),
      mvp: mvpPlayer ? {
        playerId: mvpPlayer.id,
        nickname: (mvpPlayer as any).nickname, // Player 테이블의 고정된 닉네임
        score: maxScore,
      } : null,
    });

    // 정리
    this.gameStartTime.delete(roomId);
    this.gamePlayerIds.delete(roomId);
  }

  @SubscribeMessage('shake')
  async handleShake(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { count: number },
  ) {
    const { roomId, playerId, nickname, team } = client;
    if (!roomId || !playerId || !team) return;

    // Schmitt Trigger 방식: 프론트에서 1회 흔들기 감지 시 count=1 전송
    const amount = Math.max(1, Math.min(data.count || 1, 10)); // 1~10 (보통 1)

    // 팀 점수 + 개인 점수 동시 증가
    const [newTeamScore, newPlayerScore] = await Promise.all([
      this.gamesService.handleShake(roomId, team, amount),
      this.redis.incrementPlayerScore(roomId, playerId, amount),
    ]);

    // 전체 팀 점수 조회
    const teamScores = await this.gamesService.getScores(roomId);

    // 실시간 브로드캐스트: 누가 흔들었는지 + 전체 점수 -> 방장(Host)에게만 전송
    this.server.to(`${roomId}_host`).emit('score_update', {
      // 이벤트 발생 정보
      event: {
        playerId,
        nickname,
        team,
        amount,
        playerScore: newPlayerScore,
      },
      // 전체 팀 점수
      teams: teamScores,
    });

    // 승리 조건 체크
    const winner = await this.gamesService.checkWinCondition(roomId);
    if (winner) {
      await this.endGame(roomId, winner);
    }
  }
}