import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name);

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
    const googleName = payload.name || `User-${googleId.slice(-4)}`;
    const googlePicture = payload.picture; // 구글 프로필 이미지 URL

    // 유저 찾기 또는 생성
    let user = await this.prisma.user.findUnique({ where: { googleId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { 
          googleId, 
          nickname: googleName,
          profileImage: googlePicture // 최초 생성 시 구글 이미지를 기본값으로 설정
        },
      });
    }

    // 토큰 생성 및 반환
    const tokens = await this.getTokens(user.id, user.googleId, user.nickname);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    
    return { 
      ...tokens, 
      user: { 
        id: user.id, 
        nickname: user.nickname, 
        googleName: googleName,
        profileImage: user.profileImage // 현재 저장된 이미지 (구글 URL 혹은 업로드된 경로)
      } 
    };
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

  async updateNickname(userId: string, nickname: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });
  }

  async updateProfile(userId: string, nickname: string, profileImage?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname,
        ...(profileImage && { profileImage }),
      },
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
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'fallback_access_secret';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'fallback_refresh_secret';

    if (accessSecret === 'fallback_access_secret') {
      this.logger.warn('JWT_ACCESS_SECRET is missing! Using fallback secret.');
    }

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, googleId, nickname },
        {
          secret: accessSecret,
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '1h',
        } as any,
      ),
      this.jwtService.signAsync(
        { sub: userId, googleId, nickname },
        {
          secret: refreshSecret,
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
        } as any,
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
    
    // upsert를 사용하여 동시성 문제 해결 (없으면 생성, 있으면 리턴)
    return this.prisma.user.upsert({
      where: { googleId: devUid },
      update: {}, // 이미 존재하면 아무것도 안 함 (그냥 리턴)
      create: {
        googleId: devUid,
        nickname: `테스터-${token.split('-').pop()}`,
      },
    });
  }
}
