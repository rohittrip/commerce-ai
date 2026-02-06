import { Module, Global, forwardRef } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorGrpcController } from './orchestrator.grpc.controller';
import { LLMRouter } from './llm/router';
import { LLMExtractionService } from './llm/llm-extraction.service';
import { OpenAIClient } from './llm/openai.client';
import { ClaudeClient } from './llm/claude.client';
import { GeminiClient } from './llm/gemini.client';
import { MCPClient } from './tools/mcp.client';
import { InternalToolsRegistry } from './tools/internal-tools.registry';
import { IntentService } from './intent/intent.service';
import { UserContextService } from './context/user-context.service';
import { ToolCacheService } from './cache/tool-cache.service';
import { CircuitBreakerService } from './resilience/circuit-breaker.service';
import { PromptService } from './prompts/prompt.service';
import { AgentsModule } from './agents/agents.module';

@Global()
@Module({
  imports: [forwardRef(() => AgentsModule)],
  controllers: [OrchestratorController, OrchestratorGrpcController],
  providers: [
    OrchestratorService,
    LLMRouter,
    LLMExtractionService,
    OpenAIClient,
    ClaudeClient,
    GeminiClient,
    MCPClient,
    InternalToolsRegistry,
    IntentService,
    UserContextService,
    ToolCacheService,
    CircuitBreakerService,
    PromptService,
  ],
  exports: [
    OrchestratorService,
    MCPClient,
    LLMExtractionService,
    IntentService,
    UserContextService,
    ToolCacheService,
    CircuitBreakerService,
    PromptService,
    AgentsModule,
  ],
})
export class OrchestratorModule {}
