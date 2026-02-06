import { Module } from '@nestjs/common';
import { MongoModule } from '../../mongo/mongo.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [MongoModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
