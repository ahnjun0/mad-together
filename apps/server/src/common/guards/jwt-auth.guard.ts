import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // 개발 모드 바이패스 로직 유지
    const isDevAuthEnabled = this.configService.get<string>('DEV_AUTH_ENABLED') === 'true';
    const devAuthToken = this.configService.get<string>('DEV_AUTH_TOKEN'); // e.g. 'dev-token-'

    if (isDevAuthEnabled && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token.startsWith(devAuthToken)) {
         const user = await this.authService.getOrCreateDevUser(token);
         request.user = user;
         return true;
      }
    }

    // 기본 JWT 검증 (Passport Strategy 실행)
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
