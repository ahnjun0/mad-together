import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body('nickname') nickname: string) {
    return this.authService.loginWithNickname(nickname);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() body: { userId: string; refreshToken: string }) {
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
  async updateProfile(@Req() req: any, @Body('nickname') nickname: string) {
    const user = await this.authService.updateProfile(req.user.id, nickname);
    return {
      userId: user.id,
      nickname: user.nickname,
      profileImage: user.profileImage,
    };
  }
}
