import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    // Support both username (admin/login) and mobile (OTP) flows
    if (payload.username) {
      return {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        mobile: payload.mobile as string | undefined,
      };
    }
    if (payload.mobile) {
      return {
        userId: payload.sub,
        mobile: payload.mobile,
        role: payload.role ?? 'customer',
      };
    }
    throw new UnauthorizedException();
  }
}
