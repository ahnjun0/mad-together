import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Team } from '@prisma/client';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, ValidateIf } from 'class-validator';

class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  teamAName: string;

  @IsString()
  @IsNotEmpty()
  teamBName: string;

  @IsNumber()
  @IsOptional()
  maxPlayers: number;

  @IsNumber()
  @IsOptional()
  goalScore?: number; // 목표 점수 (옵션)
}

class SelectTeamDto {
  @ValidateIf((object, value) => value !== null)
  @IsEnum(Team)
  team: Team | null;
}

class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsOptional()
  profileImage?: string;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  async createRoom(@CurrentUser() user: any, @Body() dto: CreateRoomDto) {
    const room = await this.roomsService.createRoom(
      user.id,
      dto.teamAName,
      dto.teamBName,
      dto.maxPlayers,
      dto.goalScore,
    );

    // TODO: 실제 배포 시 도메인으로 변경
    const baseUrl = process.env.MOBILE_WEB_URL || 'https://madcamp.cloud/mobile';
    const qrCode = await this.roomsService.generateQRCode(room.code, baseUrl);

    return {
      roomId: room.id,
      code: room.code,
      qrCode,
      teamAName: room.teamAName,
      teamBName: room.teamBName,
    };
  }

  // Host의 진행 중인 게임 조회
  @Get('active/me')
  async getActiveRoom(@CurrentUser() user: any) {
    const room = await this.roomsService.getActiveRoomByHost(user.id);

    if (!room) {
      return { hasActiveRoom: false, room: null };
    }

    const baseUrl = process.env.MOBILE_WEB_URL || 'https://madcamp.cloud/mobile';
    const qrCode = await this.roomsService.generateQRCode(room.code, baseUrl);

      return {
      hasActiveRoom: true,
      room: {
        roomId: room.id,
        code: room.code,
        qrCode,
        status: room.status,
        teamAName: room.teamAName,
        teamBName: room.teamBName,
        players: room.players.map(p => ({
          id: p.id,
          nickname: p.nickname, // Player 테이블의 고정된 닉네임 사용
          // Player.profileImage가 비어 있으면 User.profileImage를 사용
          profileImage: p.profileImage || (p as any).user?.profileImage || null,
          team: p.team,
          isLeader: p.isLeader,
        })),
      },
    };
  }

  @Get(':code')
  async getRoomByCode(@Param('code') code: string) {
    const room = await this.roomsService.getRoomByCode(code);
      return {
      roomId: room.id,
      code: room.code,
      status: room.status,
      teamAName: room.teamAName,
      teamBName: room.teamBName,
      host: {
        id: room.host.id,
        nickname: room.host.nickname,
      },
      players: room.players.map(p => ({
        id: p.id,
        nickname: p.nickname, // Player 테이블의 고정된 닉네임 사용
        profileImage: p.profileImage || (p as any).user?.profileImage || null,
        team: p.team,
        isLeader: p.isLeader,
      })),
    };
  }

  @Post(':code/join')
  async joinRoom(
    @Param('code') code: string,
    @CurrentUser() user: any,
    @Body() dto: JoinRoomDto,
  ) {
    const { room, player, isExisting } = await this.roomsService.joinRoom(
      code,
      user.id,
      dto.nickname,
      dto.profileImage,
    );

    return {
      roomId: room.id,
      playerId: player.id,
      code: room.code,
      status: room.status,
      teamAName: room.teamAName,
      teamBName: room.teamBName,
      nickname: player.nickname, // 고정된 닉네임 반환
      profileImage: player.profileImage,
      isExisting, // 기존 플레이어인지 여부
    };
  }

  @Patch(':roomId/players/:playerId/team')
  async selectTeam(
    @Param('roomId') roomId: string,
    @Param('playerId') playerId: string,
    @Body() dto: SelectTeamDto,
  ) {
    const player = await this.roomsService.selectTeam(roomId, playerId, dto.team);
    return {
      playerId: player.id,
      team: player.team,
    };
  }
}
