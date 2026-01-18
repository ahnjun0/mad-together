import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/google')
  @HttpCode(HttpStatus.OK)
  async loginGoogle(@Body('token') token: string) {
    return this.authService.loginWithGoogle(token);
  }

  // Refresh Token을 이용한 토큰 갱신
  // 실제 프로덕션에서는 Refresh Token을 쿠키(HttpOnly)로 주고받거나, 
  // 별도의 Guard로 검증하는 것이 좋지만, 여기서는 Body로 받는 간단한 방식으로 구현
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
}
