import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../common/config/config.module';
import { ConfigService } from '../common/config/config.service';
import { MongoUser, MongoUserSchema } from './schemas/user.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { MongoChatSession, MongoChatSessionSchema } from './schemas/chat-session.schema';
import { MongoChatMessage, MongoChatMessageSchema } from './schemas/chat-message.schema';
import { Cart, CartSchema } from './schemas/cart.schema';
import {
  MongoUserAddress,
  MongoUserAddressSchema,
} from './schemas/user-address.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.mongodbUri,
      }),
    }),
    MongooseModule.forFeature([
      { name: MongoUser.name, schema: MongoUserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: MongoChatSession.name, schema: MongoChatSessionSchema },
      { name: MongoChatMessage.name, schema: MongoChatMessageSchema },
      { name: Cart.name, schema: CartSchema },
      { name: MongoUserAddress.name, schema: MongoUserAddressSchema },
    ]),
  ],
  exports: [
    MongooseModule.forFeature([
      { name: MongoUser.name, schema: MongoUserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: MongoChatSession.name, schema: MongoChatSessionSchema },
      { name: MongoChatMessage.name, schema: MongoChatMessageSchema },
      { name: Cart.name, schema: CartSchema },
      { name: MongoUserAddress.name, schema: MongoUserAddressSchema },
    ]),
  ],
})
export class MongoModule {}
