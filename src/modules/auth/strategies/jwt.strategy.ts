import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: JwtPayload) {
    try {
      // Verify user still exists and is active
      const user = await this.authService.validateUser(payload);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User account is inactive');
      }

      // Return user info for request context
      return {
        userId: payload.sub,
        email: payload.email,
        role: user.role,
        sessionId: payload.sessionId,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
} 