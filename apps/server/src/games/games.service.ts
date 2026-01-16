import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
import { RoomStatus, Team } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private roomsService: RoomsService,
  ) {}

  // 랜덤으로 각 팀의 팀장 선정
  async selectTeamLeaders(roomId: string): Promise<{ teamA: string; teamB: string }> {
    const [teamAPlayers, teamBPlayers] = await Promise.all([
      this.roomsService.getPlayersByTeam(roomId, Team.A),
      this.roomsService.getPlayersByTeam(roomId, Team.B),
    ]);

    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      throw new Error('Both teams must have at least one player');
    }

    // 랜덤 선정
    const teamALeader = teamAPlayers[Math.floor(Math.random() * teamAPlayers.length)];
    const teamBLeader = teamBPlayers[Math.floor(Math.random() * teamBPlayers.length)];

    // Redis에 팀장 상태 저장
    await Promise.all([
      this.redis.setTeamLeader(roomId, teamALeader.id, true),
      this.redis.setTeamLeader(roomId, teamBLeader.id, true),
    ]);

    return {
      teamA: teamALeader.id,
      teamB: teamBLeader.id,
    };
  }

  // 게임 시작
  async startGame(roomId: string) {
    await this.roomsService.updateRoomStatus(roomId, RoomStatus.PLAYING);
    await this.redis.resetTeamScores(roomId);

    return {
      startedAt: new Date(),
    };
  }

  // 흔들기 이벤트 처리 (점수 증가)
  async handleShake(roomId: string, team: Team, amount: number = 1) {
    const newScore = await this.redis.incrementTeamScore(roomId, team, amount);
    return newScore;
  }

  // 현재 점수 조회
  async getScores(roomId: string) {
    return this.redis.getTeamScores(roomId);
  }

  // 게임 종료 및 결과 저장
  async endGame(roomId: string, startedAt: Date) {
    const scores = await this.redis.getTeamScores(roomId);
    const winnerTeam = scores.A > scores.B ? Team.A : scores.B > scores.A ? Team.B : null;

    // DB에 결과 저장
    const game = await this.prisma.game.create({
      data: {
        roomId,
        winnerTeam,
        teamAScore: scores.A,
        teamBScore: scores.B,
        startedAt,
        endedAt: new Date(),
      },
    });

    // 방 상태 업데이트
    await this.roomsService.updateRoomStatus(roomId, RoomStatus.FINISHED);

    return {
      gameId: game.id,
      winnerTeam,
      scores,
    };
  }

  // 목표 점수 도달 확인
  async checkWinCondition(roomId: string, targetScore: number = 1000): Promise<Team | null> {
    const scores = await this.redis.getTeamScores(roomId);

    if (scores.A >= targetScore) return Team.A;
    if (scores.B >= targetScore) return Team.B;
    return null;
  }
}
