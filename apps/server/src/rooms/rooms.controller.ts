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
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Team } from '@prisma/client';

class CreateRoomDto {
  teamAName: string;
  teamBName: string;
  maxPlayers: number;
}

class SelectTeamDto {
  team: Team | null;
}

@Controller('rooms')
@UseGuards(FirebaseAuthGuard)
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  async createRoom(@CurrentUser() user: any, @Body() dto: CreateRoomDto) {
    const room = await this.roomsService.createRoom(
      user.id,
      dto.teamAName,
      dto.teamBName,
      dto.maxPlayers,
    );

    // TODO: 실제 배포 시 도메인으로 변경
    const baseUrl = process.env.MOBILE_WEB_URL || 'https://m.example.com';
    const qrCode = await this.roomsService.generateQRCode(room.code, baseUrl);

    return {
      roomId: room.id,
      code: room.code,
      qrCode,
      teamAName: room.teamAName,
      teamBName: room.teamBName,
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
        nickname: p.user.nickname,
        team: p.team,
        isHost: p.isHost,
      })),
    };
  }

  @Post(':code/join')
  async joinRoom(@Param('code') code: string, @CurrentUser() user: any) {
    const { room, player } = await this.roomsService.joinRoom(code, user.id);

    return {
      roomId: room.id,
      playerId: player.id,
      code: room.code,
      status: room.status,
      teamAName: room.teamAName,
      teamBName: room.teamBName,
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
