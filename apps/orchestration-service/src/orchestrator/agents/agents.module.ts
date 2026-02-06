import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { AgentRegistryService } from './agent-registry.service';
import { SharedContextService } from './shared-context.service';
import { TaskQueueService } from './task-queue.service';
import { LeaderAgent } from './leader.agent';
import { ProductBrowsingAgent } from './product-browsing.agent';
import { ShoppingAgent } from './shopping.agent';

/**
 * Agents module provides multi-agent orchestration infrastructure
 *
 * This module contains:
 * - BaseAgent: Abstract class for all agents
 * - AgentRegistryService: Agent lifecycle and discovery
 * - SharedContextService: Cross-agent state management
 * - TaskQueueService: Task dependency resolution
 * - LeaderAgent: Main orchestrator agent
 * - ProductBrowsingAgent: Search and discovery agent
 * - ShoppingAgent: Cart management agent
 *
 * Note: Uses forwardRef to resolve circular dependency with OrchestratorModule
 */
@Module({
  imports: [
    // Import OrchestratorModule to access IntentService, MCPClient, UserContextService
    // Use forwardRef to prevent circular dependency since OrchestratorModule imports AgentsModule
    forwardRef(() => require('../orchestrator.module').OrchestratorModule),
  ],
  providers: [
    // Infrastructure
    AgentRegistryService,
    SharedContextService,
    TaskQueueService,
    // Agents
    LeaderAgent,
    ProductBrowsingAgent,
    ShoppingAgent,
  ],
  exports: [
    AgentRegistryService,
    SharedContextService,
    TaskQueueService,
    LeaderAgent,
    ProductBrowsingAgent,
    ShoppingAgent,
  ],
})
export class AgentsModule implements OnModuleInit {
  constructor(
    private agentRegistry: AgentRegistryService,
    private leaderAgent: LeaderAgent,
    private productBrowsingAgent: ProductBrowsingAgent,
    private shoppingAgent: ShoppingAgent,
  ) {}

  /**
   * Register all agents on module initialization
   */
  async onModuleInit() {
    // Register agents in priority order
    this.agentRegistry.registerAgent(this.leaderAgent);
    this.agentRegistry.registerAgent(this.productBrowsingAgent);
    this.agentRegistry.registerAgent(this.shoppingAgent);

    console.log('Multi-agent system initialized successfully');
    console.log(this.agentRegistry.getStats());
  }
}
