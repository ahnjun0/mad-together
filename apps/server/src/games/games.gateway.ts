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

  private scoreUpdateInterval: Map<string, NodeJS.Timeout> = new Map();
  private gameStartTime: Map<string, Date> = new Map();

  constructor(
    private gamesService: GamesService,
    private roomsService: RoomsService,
    private redis: RedisService,
    private authService: AuthService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // 토큰 검증 (handshake에서 토큰 전달)
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = await this.authService.verifyToken(token);
      const user = await this.authService.getUserByFirebaseUid(decoded.uid);

      if (!user) {
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

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`Client disconnected: ${client.id}`);

    if (client.roomId) {
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

    // 모든 플레이어 준비 확인
    const room = await this.roomsService.getRoomById(roomId);
    const playerIds = room.players.map(p => p.id);
    const allReady = await this.redis.areAllPlayersReady(roomId, playerIds);

    if (allReady && playerIds.length >= 2) {
      this.server.to(roomId).emit('all_ready');
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

  @SubscribeMessage('start_tutorial')
  async handleStartTutorial(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { roomId } = client;
    if (!roomId) return;

    await this.roomsService.updateRoomStatus(roomId, RoomStatus.TUTORIAL);
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

    await this.roomsService.updateRoomStatus(roomId, RoomStatus.CASTING);
    this.server.to(roomId).emit('casting_phase');
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

    // 모든 플레이어 점수 초기화
    await this.redis.resetAllPlayerScores(roomId, playerIds);

    await this.gamesService.startGame(roomId);
    this.gameStartTime.set(roomId, new Date());

    this.server.to(roomId).emit('game_started');

    // 200ms마다 전체 점수 브로드캐스트 (팀 + 개인)
    const scoreInterval = setInterval(async () => {
      const [teamScores, playerScores] = await Promise.all([
        this.gamesService.getScores(roomId),
        this.redis.getAllPlayerScores(roomId, playerIds),
      ]);

      this.server.to(roomId).emit('score_update', {
        teams: teamScores,
        players: Object.fromEntries(playerScores),
      });

      // 승리 조건 체크
      const winner = await this.gamesService.checkWinCondition(roomId);
      if (winner) {
        clearInterval(scoreInterval);
        this.scoreUpdateInterval.delete(roomId);
        this.endGame(roomId, winner, playerIds);
      }
    }, 200);

    this.scoreUpdateInterval.set(roomId, scoreInterval);
  }

  private async endGame(roomId: string, winnerTeam: Team, playerIds: string[]) {
    const startedAt = this.gameStartTime.get(roomId) || new Date();
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

    this.gameStartTime.delete(roomId);
  }

  @SubscribeMessage('shake')
  async handleShake(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { intensity: number },
  ) {
    const { roomId, playerId, nickname, team } = client;
    if (!roomId || !playerId || !team) return;

    // 점수 증가 (intensity에 따라 가중치 적용 가능)
    const amount = Math.max(1, Math.min(Math.floor(data.intensity / 10), 5)); // 1~5점

    // 팀 점수 + 개인 점수 동시 증가
    const [teamScore, playerScore] = await Promise.all([
      this.gamesService.handleShake(roomId, team, amount),
      this.redis.incrementPlayerScore(roomId, playerId, amount),
    ]);

    // 누가 흔들었는지 실시간 브로드캐스트
    this.server.to(roomId).emit('player_shook', {
      playerId,
      nickname,
      team,
      amount,
      playerScore,
      teamScore,
    });
  }
}
