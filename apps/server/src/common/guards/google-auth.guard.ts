import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Development Authentication Bypass
    const isDevAuthEnabled = this.configService.get<boolean>('dev.authEnabled');
    const devAuthToken = this.configService.get<string>('dev.authToken');

    if (isDevAuthEnabled && token.startsWith(devAuthToken)) {
      const user = await this.authService.getOrCreateDevUser(token);
      request.user = user;
      return true;
    }

    try {
      const decoded = await this.authService.verifyToken(token);
      // decoded.uid comes from payload.sub in auth.service.ts
      const user = await this.authService.getUserByGoogleId(decoded.uid);

      if (!user) {
        throw new UnauthorizedException('User not registered');
      }

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}