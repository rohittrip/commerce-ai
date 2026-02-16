import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '../common/config/config.service';
import { MongoChatMessage, MongoChatMessageSchema } from './schemas/chat-message.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.mongodbUri || 'mongodb://localhost:27017/commerce_ai',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: MongoChatMessage.name, schema: MongoChatMessageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
