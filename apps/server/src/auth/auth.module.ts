import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({}),
  ],
  providers: [AuthService, GoogleAuthGuard, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, GoogleAuthGuard, JwtModule],
})
export class AuthModule {}
