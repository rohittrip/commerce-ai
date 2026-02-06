import { Module } from '@nestjs/common';
import { MongoModule } from '../../mongo/mongo.module';
import { OrchestratorModule } from '../../orchestrator/orchestrator.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MongoModule, OrchestratorModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
