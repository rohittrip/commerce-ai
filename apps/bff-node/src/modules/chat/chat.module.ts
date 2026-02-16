import { Module } from '@nestjs/common';
import { MongoModule } from '../../mongo/mongo.module';
import { OrchestratorModule } from '../../orchestrator/orchestrator.module';
import { OtpAuthModule } from '../otp-auth/otp-auth.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MongoModule, OrchestratorModule, OtpAuthModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
