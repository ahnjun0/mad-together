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

  async createRoom(hostUserId: string, teamAName: string, teamBName: string, maxPlayers: number = 10) {
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
        ...({ maxPlayers } as any)
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

    // 이미 참가한 경우 기존 player 반환 (상태 무관)
    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      return { room, player: existingPlayer };
    }

    if (room.status !== RoomStatus.WAITING) {
      throw new BadRequestException('Room is not accepting new players');
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
    // 트랜잭션으로 처리하여 동시성 문제 예방
    return this.prisma.$transaction(async (tx) => {
      // 1. 현재 방의 해당 팀 리더가 있는지 확인
      let isLeader = false;
      if (team) {
        const existingLeader = await tx.player.findFirst({
          where: {
            roomId,
            team,
            id: { not: playerId }, // 자기 자신 제외
            ...({ isLeader: true } as any)
          }
        });
        
        // 리더가 없으면 내가 리더
        if (!existingLeader) {
          isLeader = true;
        }
      }

      // 2. 플레이어 업데이트
      const player = await tx.player.update({
        where: { id: playerId },
        data: { 
          team,
          ...({ isLeader: isLeader } as any)
        },
        include: { user: true },
      });

      return player;
    });
  }

  // 리더 수동 변경
  async changeLeader(roomId: string, team: Team, oldLeaderId: string, newLeaderId: string) {
    return this.prisma.$transaction([
      this.prisma.player.update({
        where: { id: oldLeaderId },
        data: { ...({ isLeader: false } as any) }
      }),
      this.prisma.player.update({
        where: { id: newLeaderId },
        data: { ...({ isLeader: true } as any) }
      })
    ]);
  }

  // 리더 위임 (현재 리더가 나갈 때 사용)
  async delegateLeader(roomId: string, team: Team, currentLeaderId: string) {
    const nextLeader = await this.prisma.player.findFirst({
      where: {
        roomId,
        team,
        id: { not: currentLeaderId }
      },
      orderBy: { createdAt: 'asc' } // 가장 먼저 들어온 사람
    });

    if (nextLeader) {
      const [_, updatedLeader] = await this.prisma.$transaction([
        this.prisma.player.update({
          where: { id: currentLeaderId },
          data: { ...({ isLeader: false } as any) }
        }),
        this.prisma.player.update({
          where: { id: nextLeader.id },
          data: { ...({ isLeader: true } as any) },
          include: { user: true }
        })
      ]);
      return updatedLeader;
    }
    return null;
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
