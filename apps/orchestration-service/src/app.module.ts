import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { MongoModule } from './mongo/mongo.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    MongoModule,
    OrchestratorModule,
    AdminModule,
  ],
})
export class AppModule {}
