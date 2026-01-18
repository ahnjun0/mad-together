import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GamesService } from './games.service';
import { RoomsService } from '../rooms/rooms.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt'; // Import JwtService
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { Team, RoomStatus } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  playerId?: string;
  roomId?: string;
  nickname?: string;
  team?: Team;
}

@WebSocketGateway({
  cors: {
    origin: '*', // 프로덕션에서는 특정 도메인으로 제한
  },
  namespace: '/game',
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private gameStartTime: Map<string, Date> = new Map();
  private gamePlayerIds: Map<string, string[]> = new Map(); // roomId -> playerIds

  constructor(
    private gamesService: GamesService,
    private roomsService: RoomsService,
    private redis: RedisService,
    private authService: AuthService,
    private jwtService: JwtService, // Inject JwtService
    private configService: ConfigService, // Inject ConfigService
  ) {}

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
      if (isDevAuthEnabled && token.startsWith(devAuthToken)) {
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
            nickname: (newLeader as any).user.nickname
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
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    const { roomId, playerId } = data;

    // 현재 방 상태 전송
    const room = await this.roomsService.getRoomById(roomId);
    const player = room.players.find(p => p.id === playerId);

    if (!player) return;

    client.roomId = roomId;
    client.playerId = playerId;
    client.nickname = player.user.nickname;
    client.team = player.team || undefined;
    client.join(roomId);

    if (player.isHost) {
      client.join(`${roomId}_host`);
    }

    // 방의 다른 사람들에게 알림
    client.to(roomId).emit('player_joined', {
      playerId,
      nickname: player.user.nickname,
    });

    const playerIds = room.players.map(p => p.id);

    // Redis에서 실시간 상태 가져오기
    const [readyStates, playerScores] = await Promise.all([
      Promise.all(
        playerIds.map(async (id) => ({
          playerId: id,
          isReady: await this.redis.getPlayerReady(roomId, id),
          sensorChecked: await this.redis.getSensorChecked(roomId, id),
        })),
      ),
      this.redis.getAllPlayerScores(roomId, playerIds),
    ]);

    client.emit('room_state', {
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        teamAName: room.teamAName,
        teamBName: room.teamBName,
      },
      players: room.players.map(p => ({
        id: p.id,
        nickname: p.user.nickname,
        team: p.team,
        isHost: p.isHost,
        score: playerScores.get(p.id) || 0,
        ...readyStates.find(rs => rs.playerId === p.id),
      })),
    });
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.roomId && client.playerId) {
      client.leave(client.roomId);
      client.to(client.roomId).emit('player_left', { playerId: client.playerId });
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
      nickname: newLeaderPlayer.user.nickname
    });
  }

  @SubscribeMessage('select_team')
  async handleSelectTeam(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { team: Team | null },
  ) {
    const { roomId, playerId } = client;
    if (!roomId || !playerId) return;

    const player = await this.roomsService.selectTeam(roomId, playerId, data.team);
    client.team = player.team || undefined;

    this.server.to(roomId).emit('player_updated', {
      playerId,
      team: player.team,
    });
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

    // 모든 플레이어 준비 확인 (호스트 제외)
    const room = await this.roomsService.getRoomById(roomId);
    
    // 호스트가 아닌 실제 플레이어들만 추출
    const activePlayerIds = room.players
      .filter(p => !p.isHost)
      .map(p => p.id);

    // 플레이어가 2명 이상일 때만 시작 (또는 테스트를 위해 1명 이상 등 정책 결정)
    // 여기서는 최소 2명 (봇 포함)이 있어야 게임 성립한다고 가정
    if (activePlayerIds.length >= 2) {
      const allReady = await this.redis.areAllPlayersReady(roomId, activePlayerIds);
      if (allReady) {
        this.server.to(roomId).emit('all_ready');
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

    // 모든 플레이어 센서 확인 완료 체크
    const room = await this.roomsService.getRoomById(roomId);
    const playerIds = room.players.map(p => p.id);
    const allChecked = await this.redis.areAllSensorChecked(roomId, playerIds);

    if (allChecked) {
      this.server.to(roomId).emit('all_sensor_checked');
    }
  }

  @SubscribeMessage('start_cinematic')
  async handleStartCinematic(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { roomId } = client;
    if (!roomId) return;

    await this.roomsService.updateRoomStatus(roomId, (RoomStatus as any).CINEMATIC);
    this.server.to(roomId).emit('cinematic_started');
  }

  @SubscribeMessage('start_tutorial')
  async handleStartTutorial(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { roomId } = client;
    if (!roomId) return;

    await this.roomsService.updateRoomStatus(roomId, (RoomStatus as any).TUTORIAL);
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
    this.server.to(roomId).emit('casting_phase');
  }

  @SubscribeMessage('cast_action')
  async handleCastAction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { power: number },
  ) {
    const { roomId, playerId, team } = client;
    if (!roomId || !playerId || !team) return;

    // 팀장인지 확인
    const isLeader = await this.redis.getTeamLeader(roomId, playerId);
    if (!isLeader) return;

    this.server.to(roomId).emit('cast_result', {
      team,
      power: data.power,
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

    await this.gamesService.startGame(roomId);
    this.gameStartTime.set(roomId, new Date());

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

    this.server.to(roomId).emit('game_ended', {
      winnerTeam,
      teamScores: result.scores,
      playerScores: room.players.map(p => ({
        playerId: p.id,
        nickname: p.user.nickname,
        team: p.team,
        score: playerScores.get(p.id) || 0,
      })),
      mvp: mvpPlayer ? {
        playerId: mvpPlayer.id,
        nickname: mvpPlayer.user.nickname,
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