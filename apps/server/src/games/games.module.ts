import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesGateway } from './games.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RoomsModule, AuthModule],
  providers: [GamesService, GamesGateway],
  exports: [GamesService],
})
export class GamesModule {}
