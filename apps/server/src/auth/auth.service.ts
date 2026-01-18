import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    this.googleClient = new OAuth2Client(clientId);
  }

  // 1. 구글 토큰 검증
  async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: this.configService.get<string>('google.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload) {
         throw new UnauthorizedException('Invalid Google token');
      }
      return { ...payload, uid: payload.sub };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  // 2. 로그인 (Access + Refresh Token 발급)
  async loginWithGoogle(idToken: string) {
    const payload = await this.verifyGoogleToken(idToken);
    
    const googleId = payload.sub;
    const nickname = payload.name || `User-${googleId.slice(-4)}`;

    // 유저 찾기 또는 생성
    let user = await this.prisma.user.findUnique({ where: { googleId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { googleId, nickname },
      });
    }

    // 토큰 생성 및 반환
    const tokens = await this.getTokens(user.id, user.googleId, user.nickname);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    
    return { ...tokens, user: { id: user.id, nickname: user.nickname } };
  }

  // 3. 토큰 갱신 (Refresh Token 사용)
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.currentRefreshToken) throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.currentRefreshToken);
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.googleId, user.nickname);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // 4. 로그아웃 (Refresh Token 삭제)
  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, currentRefreshToken: { not: null } },
      data: { currentRefreshToken: null },
    });
  }

  // --- Helper Methods ---
  
  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentRefreshToken: hash },
    });
  }

  async getTokens(userId: string, googleId: string, nickname: string) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, googleId, nickname },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, googleId, nickname },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
        },
      ),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }

  // 기존 호환성 유지 및 유틸리티
  async verifyToken(token: string) {
      // 기존에 GoogleAuthGuard에서 쓰던 메서드
      return this.verifyGoogleToken(token);
  }

  async getUserByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  async getOrCreateDevUser(token: string) {
    const devUid = `dev-uid-${token}`;
    let user = await this.prisma.user.findUnique({ where: { googleId: devUid } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: devUid,
          nickname: `테스터-${token.split('-').pop()}`,
        },
      });
    }
    return user;
  }
}
