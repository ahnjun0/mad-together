import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
        const ext = extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async updateProfile(
    @Req() req: any,
    @Body('nickname') nickname: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // 파일이 있으면 URL 생성, 없으면 undefined
    const profileImageUrl = file ? `/uploads/${file.filename}` : undefined;
    
    // 닉네임과 이미지를 업데이트 (닉네임은 필수라고 가정)
    const user = await this.authService.updateProfile(req.user.id, nickname, profileImageUrl);
    
    return {
      userId: user.id,
      nickname: user.nickname,
      profileImage: user.profileImage,
    };
  }
}
