import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';

class RegisterDto {
  idToken: string;
  nickname: string;
}

class UpdateNicknameDto {
  nickname: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const decoded = await this.authService.verifyToken(dto.idToken);
    const user = await this.authService.findOrCreateUser(decoded.uid, dto.nickname);
    return { userId: user.id, nickname: user.nickname };
  }

  @Post('nickname')
  @UseGuards(GoogleAuthGuard)
  async updateNickname(@Req() req: any, @Body() dto: UpdateNicknameDto) {
    const user = await this.authService.updateNickname(req.user.id, dto.nickname);
    return { userId: user.id, nickname: user.nickname };
  }
}