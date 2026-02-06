import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProvidersService } from './providers.service';
import { ToolsService } from './tools.service';
import { DatabaseModule } from '../common/database/database.module';
import { AgentsModule } from '../orchestrator/agents/agents.module';

@Module({
  imports: [DatabaseModule, AgentsModule],
  controllers: [AdminController],
  providers: [AdminService, ProvidersService, ToolsService],
  exports: [AdminService, ProvidersService, ToolsService],
})
export class AdminModule {}
