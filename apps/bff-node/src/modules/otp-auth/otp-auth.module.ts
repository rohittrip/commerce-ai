import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongoModule } from '../../mongo/mongo.module';
import { ConfigModule } from '../../common/config/config.module';
import { ConfigService } from '../../common/config/config.service';
import { OtpAuthController } from './otp-auth.controller';
import { OtpAuthService } from './otp-auth.service';

@Module({
  imports: [
    MongoModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.accessTokenExpiresInSec },
      }),
    }),
  ],
  controllers: [OtpAuthController],
  providers: [OtpAuthService],
  exports: [OtpAuthService],
})
export class OtpAuthModule {}
