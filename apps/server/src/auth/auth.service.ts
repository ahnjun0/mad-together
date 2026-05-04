import { Injectable, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 닉네임 기반 로그인 (오픈캠퍼스 전시용 - 항상 새 유저 생성)
  async loginWithNickname(nickname: string) {
    const trimmed = (nickname ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('닉네임을 입력해주세요.');
    }
    if (trimmed.length > 20) {
      throw new BadRequestException('닉네임은 20자 이하로 입력해주세요.');
    }

    const localId = `local-${randomUUID()}`;
    const user = await this.prisma.user.create({
      data: {
        googleId: localId,
        nickname: trimmed,
        profileImage: null,
      },
    });

    const tokens = await this.getTokens(user.id, user.googleId, user.nickname);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        nickname: user.nickname,
        profileImage: user.profileImage,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.currentRefreshToken) throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.currentRefreshToken);
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.googleId, user.nickname);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

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

  async updateProfile(userId: string, nickname: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });
  }

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
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '12h',
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

  async getOrCreateDevUser(token: string) {
    const devUid = `dev-uid-${token}`;

    return this.prisma.user.upsert({
      where: { googleId: devUid },
      update: {},
      create: {
        googleId: devUid,
        nickname: `테스터-${token.split('-').pop()}`,
      },
    });
  }
}
