import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { CartModule } from './modules/cart/cart.module';
import { ProductsModule } from './modules/products/products.module';
import { AdminModule } from './modules/admin/admin.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { ConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { MongoModule } from './mongo/mongo.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    MongoModule,
    OrchestratorModule,
    AuthModule,
    ChatModule,
    CartModule,
    ProductsModule,
    AdminModule,
    TelemetryModule,
    MobileModule,
  ],
})
export class AppModule {}
