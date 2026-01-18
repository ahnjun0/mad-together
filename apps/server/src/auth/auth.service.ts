import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    this.googleClient = new OAuth2Client(clientId);
  }

  async verifyToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: this.configService.get<string>('google.clientId'),
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }
      // Map 'sub' to 'uid' to maintain compatibility with existing logic if needed,
      // or just use 'sub' as the unique identifier.
      return { ...payload, uid: payload.sub };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async findOrCreateUser(googleId: string, nickname: string) {
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId,
          nickname,
        },
      });
    }

    return user;
  }

  async updateNickname(userId: string, nickname: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
    });
  }

  async getUserByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  // auth.service.ts
  async getOrCreateDevUser(token: string) {
    // 토큰 문자열(예: dev-token-1)을 기반으로 고유한 UID 생성
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