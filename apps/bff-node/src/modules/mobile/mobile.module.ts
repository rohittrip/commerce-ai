import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '../../common/config/config.module';
import { ConfigService } from '../../common/config/config.service';
import { MongoModule } from '../../mongo/mongo.module';
import { MobileController } from './mobile.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileSessionsService } from './mobile-sessions.service';
import { MobileChatService } from './mobile-chat.service';
import { MobileCartService } from './mobile-cart.service';
import { MobileAddressService } from './mobile-address.service';

@Module({
  imports: [
    MongoModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),
  ],
  controllers: [MobileController],
  providers: [
    MobileAuthService,
    MobileSessionsService,
    MobileChatService,
    MobileCartService,
    MobileAddressService,
  ],
  exports: [MobileAuthService, MobileChatService, MobileCartService, MobileAddressService],
})
export class MobileModule {}
