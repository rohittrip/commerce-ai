import { Injectable } from '@nestjs/common';
import {
  BaseAgent,
  AgentCapability,
  AgentTask,
  AgentResponse,
} from './base.agent';
import { StreamChunk } from '../llm/provider.interface';
import { Intent, ConversationState } from '../../common/types';
import { IntentService } from '../intent/intent.service';
import { UserContextService } from '../context/user-context.service';
import { AgentRegistryService } from './agent-registry.service';
import { SharedContextService } from './shared-context.service';
import { LLMExtractionService } from '../llm/llm-extraction.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Leader Agent - Main orchestrator for all user requests
 *
 * Responsibilities:
 * - Intent detection and classification
 * - Route requests to specialized agents
 * - Aggregate multi-agent responses
 * - Maintain conversation flow and context
 * - Handle clarifications and follow-ups
 */
@Injectable()
export class LeaderAgent extends BaseAgent {
  readonly name = 'LeaderAgent';
  readonly capabilities = [
    AgentCapability.GENERAL_CHAT,
    AgentCapability.SEARCH,
    AgentCapability.COMPARE,
    AgentCapability.CART,
    AgentCapability.CHECKOUT,
    AgentCapability.SUPPORT,
  ];
  readonly priority = 100; // Highest priority - handles everything

  // Leader can delegate to all specialized agents
  protected readonly allowedDelegations = [
    'ProductBrowsingAgent',
    'ShoppingAgent',
    'CheckoutAgent',
    'ReasoningAgent',
    'CustomerSupportAgent',
    'AnalyticsAgent',
  ];

  // Flag to use LLM-based routing (can be configured via admin)
  private useLLMRouting: boolean = true;

  constructor(
    private intentService: IntentService,
    private userContextService: UserContextService,
    private agentRegistry: AgentRegistryService,
    private sharedContext: SharedContextService,
    private llmExtraction: LLMExtractionService,
  ) {
    super();
  }

  /**
   * Leader Agent can handle all tasks
   */
  canHandle(task: AgentTask): boolean {
    // Leader is the default handler for all requests
    return true;
  }

  /**
   * Execute task by routing to appropriate specialized agent
   */
  async *execute(task: AgentTask): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    this.log('info', `Executing task ${task.id}`, {
      type: task.type,
      intent: task.intent,
    });

    try {
      // Detect intent if not already provided
      const intent = await this.detectIntent(task);

      // Update shared context
      await this.sharedContext.updateAgentState(task.context.sessionId, this.name, {
        agentName: this.name,
        currentTask: task,
        status: 'working',
        startedAt: new Date().toISOString(),
        workingMemory: { intent },
      });

      // Route to appropriate specialized agent based on intent
      const targetAgent = this.selectTargetAgent(intent, task);

      if (targetAgent) {
        this.log('info', `Routing to ${targetAgent} for intent ${intent}`);

        // Create delegated task
        const delegatedTask: AgentTask = {
          ...task,
          type: intent,
          intent,
        };

        // Delegate to specialized agent - stream directly to preserve all event types
        try {
          // Stream all chunks from the specialized agent (preserves cards, comparison, etc.)
          for await (const chunk of this.streamFromSpecializedAgent(targetAgent, delegatedTask)) {
            yield chunk;
          }

          // Update agent state
          await this.sharedContext.updateAgentState(task.context.sessionId, this.name, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });
        } catch (delegationError) {
          this.log('error', `Delegation failed: ${delegationError.message}`);
          // Fall back to general chat
          yield* this.handleGeneralChat(task);
        }
      } else {
        // No specialized agent - handle as general chat
        yield* this.handleGeneralChat(task);
      }

      // Log completion
      const duration = Date.now() - startTime;
      this.log('info', `Task completed`, { taskId: task.id, duration });

    } catch (error) {
      this.log('error', `Task failed: ${error.message}`, {
        taskId: task.id,
        error: error.stack,
      });

      yield {
        type: 'error',
        error: `Leader Agent error: ${error.message}`,
      };

      // Update agent state
      await this.sharedContext.updateAgentState(task.context.sessionId, this.name, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Detect intent from task parameters or user message
   * Uses LLM-based detection when enabled, falls back to rule-based
   */
  private async detectIntent(task: AgentTask): Promise<Intent> {
    // If intent already provided in task, use it
    if (task.intent && task.intent !== Intent.GENERAL_CHAT) {
      return task.intent;
    }

    // Extract user message from parameters
    const userMessage =
      task.parameters.message ||
      task.parameters.query ||
      task.parameters.userMessage ||
      '';

    if (!userMessage) {
      return Intent.GENERAL_CHAT;
    }

    // Use LLM-based intent detection if enabled
    if (this.useLLMRouting) {
      try {
        const llmResult = await this.llmExtraction.detectAgentRouting(userMessage);
        
        this.log('info', `LLM detected intent: ${llmResult.intent}`, {
          targetAgent: llmResult.targetAgent,
          confidence: llmResult.confidence,
          reasoning: llmResult.reasoning,
        });

        // Update task with LLM-detected target agent for later use
        task.parameters._llmTargetAgent = llmResult.targetAgent;
        task.parameters._llmConfidence = llmResult.confidence;

        return llmResult.intent;
      } catch (error) {
        this.log('warn', `LLM routing failed, falling back to rule-based: ${error.message}`);
        // Fall through to rule-based detection
      }
    }

    // Fallback: Detect intent using rule-based IntentService
    const intentFrame = await this.intentService.detectIntent(
      userMessage,
      task.context,
    );

    this.log('debug', `Rule-based detected intent: ${intentFrame.intent}`, {
      confidence: intentFrame.confidence,
      needsClarification: intentFrame.needClarification,
    });

    return intentFrame.intent;
  }

  /**
   * Select target agent based on intent
   * Uses LLM-detected target agent if available and confidence is high
   */
  private selectTargetAgent(intent: Intent, task?: AgentTask): string | null {
    // Use LLM-detected target agent if available and confidence is high
    if (task?.parameters?._llmTargetAgent && task?.parameters?._llmConfidence > 0.7) {
      const llmTarget = task.parameters._llmTargetAgent;
      
      // Validate the LLM suggestion is in our allowed delegations
      if (this.allowedDelegations.includes(llmTarget)) {
        this.log('debug', `Using LLM-suggested agent: ${llmTarget}`);
        return llmTarget;
      }
    }

    // Fallback to rule-based mapping
    const mapping: Record<Intent, string | null> = {
      [Intent.PRODUCT_SEARCH]: 'ProductBrowsingAgent',
      [Intent.PRODUCT_COMPARE]: 'ProductBrowsingAgent',
      [Intent.ADD_TO_CART]: 'ShoppingAgent',
      [Intent.UPDATE_CART_QTY]: 'ShoppingAgent',
      [Intent.REMOVE_FROM_CART]: 'ShoppingAgent',
      [Intent.CHECKOUT]: 'CheckoutAgent',
      [Intent.CREATE_ORDER]: 'CheckoutAgent',
      [Intent.ORDER_STATUS]: 'CustomerSupportAgent',
      [Intent.POLICY_QA]: 'CustomerSupportAgent',
      [Intent.GENERAL_CHAT]: null, // Handled by Leader directly
    };

    return mapping[intent] || null;
  }

  /**
   * Delegate to specialized agent with error handling
   */
  private async delegateToSpecializedAgent(
    agentName: string,
    task: AgentTask,
  ): Promise<AgentResponse> {
    // Use AgentRegistry to delegate
    return await this.agentRegistry.delegateTask(task, agentName);
  }

  /**
   * Stream directly from specialized agent to preserve all chunk types (cards, comparison, etc.)
   * This avoids the aggregation that loses structured events.
   */
  private async *streamFromSpecializedAgent(
    agentName: string,
    task: AgentTask,
  ): AsyncGenerator<StreamChunk> {
    const agent = this.agentRegistry.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    this.log('debug', `Streaming from ${agentName} for task ${task.id}`);
    
    // Directly yield all chunks from the agent - preserves cards, comparison, etc.
    for await (const chunk of agent.execute(task)) {
      // Skip 'done' chunks from sub-agents - we'll emit our own at the end
      if (chunk.type !== 'done') {
        yield chunk;
      }
    }
  }

  /**
   * Handle general chat (fallback when no specialized agent)
   */
  private async *handleGeneralChat(task: AgentTask): AsyncGenerator<StreamChunk> {
    this.log('debug', 'Handling as general chat');

    // Generate a simple response
    const response = this.generateGeneralChatResponse(task);

    yield {
      type: 'token',
      content: response,
    };

    yield {
      type: 'done',
    };
  }

  /**
   * Generate general chat response
   */
  private generateGeneralChatResponse(task: AgentTask): string {
    const greetings = ['hi', 'hello', 'hey', 'greetings'];
    const message = (
      task.parameters.message ||
      task.parameters.query ||
      ''
    ).toLowerCase();

    if (greetings.some(g => message.includes(g))) {
      return "Hello! I'm your commerce assistant. I can help you search for products, compare items, manage your cart, and complete purchases. How can I assist you today?";
    }

    return "I'm here to help with your shopping needs. You can ask me to search for products, compare items, add to cart, or check out. What would you like to do?";
  }

  /**
   * Format response from specialized agent
   */
  private async *formatResponse(
    response: AgentResponse,
    intent: Intent,
  ): AsyncGenerator<StreamChunk> {
    if (response.status === 'failure') {
      yield {
        type: 'error',
        error: response.error?.message || 'Agent execution failed',
      };
      return;
    }

    // Stream the response data
    if (typeof response.data === 'string') {
      yield {
        type: 'token',
        content: response.data,
      };
    } else if (response.data) {
      // Format structured data based on intent
      const formatted = this.formatStructuredData(response.data, intent);
      yield {
        type: 'token',
        content: formatted,
      };
    }

    yield {
      type: 'done',
    };
  }

  /**
   * Format structured data for display
   */
  private formatStructuredData(data: any, intent: Intent): string {
    // Simple JSON formatting for now
    // In production, this would format based on intent type
    // (e.g., product cards, comparison tables, cart summaries)
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  /**
   * Override delegateToAgent to use AgentRegistry
   */
  protected async delegateToAgent(
    agentName: string,
    task: AgentTask,
  ): Promise<AgentResponse> {
    // Validate delegation is allowed
    if (!this.allowedDelegations.includes(agentName)) {
      throw new Error(
        `Leader Agent cannot delegate to ${agentName}. ` +
        `Allowed: ${this.allowedDelegations.join(', ')}`
      );
    }

    // Use AgentRegistry for delegation
    return await this.agentRegistry.delegateTask(task, agentName);
  }
}
