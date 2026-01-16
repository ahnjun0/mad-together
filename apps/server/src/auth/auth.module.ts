import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Module({
  providers: [AuthService, FirebaseAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, FirebaseAuthGuard],
})
export class AuthModule {}
