import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(request: any, email: string, password: string): Promise<any> {
    try {
      const loginResult = await this.authService.login(
        { email, password },
        request.ip,
        request.get('User-Agent'),
      );

      if (!loginResult) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return loginResult.user;
    } catch (error) {
      throw new UnauthorizedException((error as Error).message || 'Invalid credentials');
    }
  }
} 