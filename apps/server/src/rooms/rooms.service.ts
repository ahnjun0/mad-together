import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RoomStatus, Team } from '@prisma/client';
import * as QRCode from 'qrcode';

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // 6자리 랜덤 코드 생성
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 문자 제외
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRoom(hostUserId: string, teamAName: string, teamBName: string) {
    // 유니크한 코드 생성
    let code: string;
    let attempts = 0;
    do {
      code = this.generateRoomCode();
      const existing = await this.prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new BadRequestException('Failed to generate unique room code');
    }

    // 1시간 후 만료
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const room = await this.prisma.room.create({
      data: {
        code,
        hostId: hostUserId,
        teamAName,
        teamBName,
        expiresAt,
        players: {
          create: {
            userId: hostUserId,
            isHost: true,
          },
        },
      },
      include: {
        players: {
          include: { user: true },
        },
      },
    });

    // Redis 초기화
    await this.redis.initRoom(room.id);

    return room;
  }

  async generateQRCode(roomCode: string, baseUrl: string): Promise<string> {
    const joinUrl = `${baseUrl}/join/${roomCode}`;
    return QRCode.toDataURL(joinUrl);
  }

  async getRoomByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          include: { user: true },
        },
        host: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.expiresAt < new Date()) {
      throw new BadRequestException('Room has expired');
    }

    return room;
  }

  async getRoomById(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: { user: true },
        },
        host: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async joinRoom(roomCode: string, userId: string) {
    const room = await this.getRoomByCode(roomCode);

    if (room.status !== RoomStatus.WAITING) {
      throw new BadRequestException('Room is not accepting new players');
    }

    // 이미 참가한 경우 기존 player 반환
    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      return { room, player: existingPlayer };
    }

    const player = await this.prisma.player.create({
      data: {
        userId,
        roomId: room.id,
      },
      include: { user: true },
    });

    return { room, player };
  }

  async selectTeam(roomId: string, playerId: string, team: Team | null) {
    const player = await this.prisma.player.update({
      where: { id: playerId },
      data: { team },
      include: { user: true },
    });

    return player;
  }

  async updateRoomStatus(roomId: string, status: RoomStatus) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }

  async leaveRoom(roomId: string, playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) return;

    // 호스트는 나갈 수 없음
    if (player.isHost) {
      throw new BadRequestException('Host cannot leave the room');
    }

    await this.prisma.player.delete({
      where: { id: playerId },
    });
  }

  async getPlayersInRoom(roomId: string) {
    return this.prisma.player.findMany({
      where: { roomId },
      include: { user: true },
    });
  }

  async getPlayersByTeam(roomId: string, team: Team) {
    return this.prisma.player.findMany({
      where: { roomId, team },
      include: { user: true },
    });
  }

  // 방 정리 (만료된 방 삭제)
  async cleanupExpiredRooms() {
    const expiredRooms = await this.prisma.room.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    for (const room of expiredRooms) {
      await this.redis.cleanupRoom(room.id);
    }

    await this.prisma.room.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
