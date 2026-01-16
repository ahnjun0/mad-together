import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private firebaseApp: admin.app.App;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Firebase Admin 초기화 (환경변수 또는 서비스 계정 키 파일 사용)
    const projectId =
      this.configService.get<string>('firebase.projectId') || 'dev-project-id';

    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        projectId,
      });
    } else {
      this.firebaseApp = admin.apps[0]!;
    }
  }

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.firebaseApp.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  async findOrCreateUser(firebaseUid: string, nickname: string) {
    let user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firebaseUid,
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

  async getUserByFirebaseUid(firebaseUid: string) {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
    });
  }

  async getOrCreateDevUser() {
    const devUid = 'dev-user-uid';
    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: devUid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firebaseUid: devUid,
          nickname: 'Dev User',
        },
      });
    }

    return user;
  }
}
