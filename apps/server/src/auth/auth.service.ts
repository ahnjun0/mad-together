import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

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
      // 구글 이미지를 서버에 다운로드하여 저장
      const localProfileImage = await this.downloadGoogleImage(googlePicture, googleId);

      user = await this.prisma.user.create({
        data: {
          googleId,
          nickname: googleName,
          profileImage: localProfileImage // 서버에 저장된 이미지 경로 사용
        },
      });
    } else if (user.profileImage?.startsWith('http')) {
      // 기존 사용자인데 아직 구글 URL을 사용 중인 경우, 서버에 다운로드
      const localProfileImage = await this.downloadGoogleImage(user.profileImage, googleId);
      if (localProfileImage) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { profileImage: localProfileImage },
        });
      }
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
        profileImage: user.profileImage // 서버에 저장된 이미지 경로
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

  /**
   * 구글 프로필 이미지를 다운로드하여 서버에 저장
   * @param googlePictureUrl 구글 프로필 이미지 URL
   * @param googleId 사용자 고유 ID (파일명에 사용)
   * @returns 저장된 이미지의 상대 경로 또는 null
   */
  private async downloadGoogleImage(googlePictureUrl: string | undefined, googleId: string): Promise<string | null> {
    if (!googlePictureUrl) return null;

    try {
      // 구글 이미지 다운로드
      const response = await fetch(googlePictureUrl);
      if (!response.ok) {
        this.logger.warn(`Failed to fetch Google image: ${response.status}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Content-Type에서 확장자 결정
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      let ext = '.jpg';
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('webp')) ext = '.webp';
      else if (contentType.includes('gif')) ext = '.gif';

      // 파일명 생성 및 저장
      const filename = `google-${googleId}-${Date.now()}${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads');
      const filepath = path.join(uploadDir, filename);

      // uploads 디렉토리가 없으면 생성
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      fs.writeFileSync(filepath, buffer);
      this.logger.log(`Google image saved: ${filename}`);

      return `/uploads/${filename}`;
    } catch (error) {
      this.logger.error(`Failed to download Google image: ${error.message}`);
      return null;
    }
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
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '12h', // 시연용 12시간
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
