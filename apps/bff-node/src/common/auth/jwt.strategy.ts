import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '../config/config.service';

// Custom extractor to get JWT from cookie
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies.auth_token || null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
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
    // Support legacy mobile field
    if (payload.mobile) {
      return {
        userId: payload.sub,
        mobile: payload.mobile,
        role: payload.role ?? 'customer',
      };
    }
    // Support new OTP auth with phoneCountry/phoneNumber
    if (payload.phoneCountry && payload.phoneNumber) {
      return {
        userId: payload.sub,
        mobile: `${payload.phoneCountry}|${payload.phoneNumber}`,
        phoneCountry: payload.phoneCountry,
        phoneNumber: payload.phoneNumber,
        role: payload.role ?? 'customer',
      };
    }
    throw new UnauthorizedException();
  }
}
