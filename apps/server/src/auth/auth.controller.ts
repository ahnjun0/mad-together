import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login/google')
  @HttpCode(HttpStatus.OK)
  async loginGoogle(@Body('token') token: string) {
    return this.authService.loginWithGoogle(token);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() body: { userId: string, refreshToken: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    await this.authService.logout(req.user.id);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('nickname')
  async updateNickname(@Req() req: any, @Body('nickname') nickname: string) {
    const user = await this.authService.updateNickname(req.user.id, nickname);
    return { userId: user.id, nickname: user.nickname };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname).toLowerCase();
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, callback) => {
      // Case-insensitive extension check + HEIC/HEIF support
      const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i;
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
      ];

      const extMatch = file.originalname.match(allowedExtensions);
      const mimeMatch = allowedMimeTypes.includes(file.mimetype);

      if (!extMatch && !mimeMatch) {
        return callback(new Error('지원되지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP 지원)'), false);
      }
      callback(null, true);
    },
  }))
  async updateProfile(
    @Req() req: any,
    @Body('nickname') nickname: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // 파일이 있으면 전체 URL 생성, 없으면 undefined
    let profileImageUrl: string | undefined;
    if (file) {
      // Relative path for client flexibility (handle baseUrl on client side)
      profileImageUrl = `/uploads/${file.filename}`;
    }

    // 닉네임과 이미지를 업데이트 (닉네임은 필수라고 가정)
    const user = await this.authService.updateProfile(req.user.id, nickname, profileImageUrl);

    return {
      userId: user.id,
      nickname: user.nickname,
      profileImage: user.profileImage,
    };
  }
}
