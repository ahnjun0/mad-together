import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';

@Module({
  providers: [AuthService, GoogleAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, GoogleAuthGuard],
})
export class AuthModule {}