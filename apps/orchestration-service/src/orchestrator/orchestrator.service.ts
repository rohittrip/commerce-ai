import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../common/database/database.service';
import { ConfigService } from '../common/config/config.service';
import { RedisService } from '../common/redis/redis.service';
import { MongoChatMessage } from '../mongo/schemas/chat-message.schema';
import { LLMRouter } from './llm/router';
import { MCPClient } from './tools/mcp.client';
import { IntentService } from './intent/intent.service';
import { UserContextService } from './context/user-context.service';
import { ToolCacheService } from './cache/tool-cache.service';
import { CircuitBreakerService } from './resilience/circuit-breaker.service';
import { PromptService } from './prompts/prompt.service';
import { InternalToolsRegistry } from './tools/internal-tools.registry';
import { LLMMessage } from './llm/provider.interface';
import { Intent, ConversationState, IntentFrame } from '../common/types';
import { sanitizeError } from '../common/utils/error-sanitizer';
import { AgentRegistryService } from './agents/agent-registry.service';
import { SharedContextService } from './agents/shared-context.service';
import { AgentTask } from './agents/base.agent';

interface ProcessMessageOptions {
  skipCache?: boolean;
  traceId?: string;
}

@Injectable()
export class OrchestratorService {
  private readonly LLM_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_RETRIES = 2;

  constructor(
    private db: DatabaseService,
    private config: ConfigService,
    private redis: RedisService,
    @InjectModel(MongoChatMessage.name) private chatMessageModel: Model<MongoChatMessage>,
    private llmRouter: LLMRouter,
    private mcpClient: MCPClient,
    private intentService: IntentService,
    private userContextService: UserContextService,
    private toolCache: ToolCacheService,
    private circuitBreaker: CircuitBreakerService,
    private promptService: PromptService,
    private internalToolsRegistry: InternalToolsRegistry,
    @Optional() @Inject(AgentRegistryService) private agentRegistry?: AgentRegistryService,
    @Optional() @Inject(SharedContextService) private sharedContext?: SharedContextService,
  ) {
    // Configure circuit breakers for tools
    this.circuitBreaker.configure('mcp-tool-server', {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenRequests: 3,
    });
  }

  async *processMessage(
    sessionId: string,
    userId: string,
    userMessage: string,
    options: ProcessMessageOptions = {},
  ): AsyncGenerator<any> {
    const traceId = options.traceId || uuidv4();
    console.log(`[${traceId}] Processing message for session ${sessionId}`);

    // Check if multi-agent mode is enabled
    const useMultiAgent = await this.isMultiAgentEnabled();

    if (useMultiAgent && this.agentRegistry && this.sharedContext) {
      console.log(`[${traceId}] Using MULTI-AGENT mode`);
      yield* this.processWithMultiAgent(sessionId, userId, userMessage, traceId);
      return;
    }

    console.log(`[${traceId}] Using SINGLE-AGENT mode (legacy)`);

    try {
      // Initialize/get user context
      const userContext = await this.userContextService.getOrCreateContext(userId, sessionId);

      // Cache trace state for debugging
      await this.redis.cacheTraceState(traceId, {
        sessionId,
        userId,
        userMessage,
        status: 'started',
        timestamp: new Date().toISOString(),
      });

      // Save user message
      await this.saveMessage(sessionId, 'user', userMessage, userId);

      // Detect intent with context awareness
      const intentFrame = await this.intentService.detectIntent(userMessage, userContext);
      console.log(`[${traceId}] Detected intent: ${intentFrame.intent} (confidence: ${intentFrame.confidence})`);

      // Update conversation state
      await this.userContextService.setConversationState(
        sessionId,
        this.getConversationState(intentFrame.intent),
        intentFrame.intent,
      );

      // Handle clarification requests
      if (this.intentService.needsClarification(intentFrame)) {
        yield* this.handleClarificationRequest(sessionId, userId, intentFrame, traceId);
        return;
      }

      // Build conversation history with context-aware system prompt
      const messages = await this.buildConversationHistory(sessionId, userContext);
      messages.push({ role: 'user', content: userMessage });

      // Get tools
      const tools = await this.mcpClient.getToolDefinitions();

      // Stream LLM response with timeout
      let assistantMessage = '';
      let toolCalls: any[] = [];

      try {
        const llmStream = this.llmRouter.generateResponse(messages, tools);
        const timeoutPromise = this.createTimeout(this.LLM_TIMEOUT);

        for await (const chunk of this.raceWithTimeout(llmStream, timeoutPromise)) {
          if (chunk.type === 'token') {
            assistantMessage += chunk.content;
            yield { type: 'token', content: chunk.content };
          } else if (chunk.type === 'tool_call') {
            toolCalls.push(chunk.toolCall);
          } else if (chunk.type === 'error') {
            yield { type: 'error', error: chunk.error };
            yield { type: 'done' };
            return;
          }
        }
      } catch (error) {
        const debugMode = this.config.debugMode || this.config.nodeEnv === 'development';
        if (error.message === 'LLM_TIMEOUT') {
          yield { type: 'error', error: sanitizeError(new Error('LLM response timed out'), debugMode, traceId) };
          yield { type: 'done' };
          return;
        }
        throw error;
      }

      // Execute tool calls with caching and circuit breaker
      for (const toolCall of toolCalls) {
        yield* this.executeToolCall(
          sessionId,
          userId,
          toolCall,
          traceId,
          userContext,
          options.skipCache,
        );
      }

      // Save assistant message
      if (assistantMessage) {
        await this.saveMessage(sessionId, 'assistant', assistantMessage, userId);
      }

      // Update trace state
      await this.redis.cacheTraceState(traceId, {
        sessionId,
        userId,
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

      // Update user context based on results
      await this.updateUserContextFromResults(sessionId, intentFrame, toolCalls);

      // Invalidate session cache to force refresh on next request
      await this.redis.del(`chat:session:${sessionId}:history`);

      // Generate follow-up suggestions
      const hasResults = toolCalls.some(tc =>
        tc.name === 'commerce.searchProducts' || tc.name === 'commerce.compareProducts',
      );
      const followups = this.intentService.getSuggestedFollowUps(intentFrame.intent, hasResults);
      if (followups.length > 0) {
        yield { type: 'followups', suggestions: followups };
      }

      yield { type: 'done' };
    } catch (error) {
      console.error(`[${traceId}] Orchestrator error:`, error);
      const debugMode = this.config.debugMode || this.config.nodeEnv === 'development';
      yield { type: 'error', error: sanitizeError(error, debugMode, traceId) };
      yield { type: 'done' };
    }
  }

  /**
   * Execute a tool call with caching and circuit breaker protection
   * Routes to internal tools or provider tools based on tool type
   */
  private async *executeToolCall(
    sessionId: string,
    userId: string,
    toolCall: any,
    traceId: string,
    userContext: any,
    skipCache?: boolean,
  ): AsyncGenerator<any> {
    console.log(`[${traceId}] Executing tool: ${toolCall.name}`);

    const startTime = Date.now();
    const toolRequest = { ...toolCall.arguments, userId, sessionId };
    const isInternal = this.internalToolsRegistry.isInternalTool(toolCall.name);

    console.log(`[${traceId}] Tool type: ${isInternal ? 'INTERNAL' : 'PROVIDER'}`);

    try {
      // Check cache first (unless skipCache is true or tool is internal)
      if (!skipCache && !isInternal && this.toolCache.shouldUseCache(toolCall.name)) {
        const cachedResult = await this.toolCache.getCachedResult(toolCall.name, toolRequest);
        if (cachedResult) {
          console.log(`[${traceId}] Using cached result for ${toolCall.name}`);
          yield* this.yieldToolResponse(toolCall.name, cachedResult, traceId);
          await this.saveToolCall(sessionId, toolCall.name, toolRequest, cachedResult, traceId, 0, null, true, isInternal);
          return;
        }
      }

      let toolResponse: any;

      // Route to internal or provider tool
      if (isInternal) {
        // Execute internal tool directly
        console.log(`[${traceId}] Executing internal tool: ${toolCall.name}`);
        toolResponse = await this.internalToolsRegistry.execute(toolCall.name, toolRequest);
      } else {
        // Execute provider tool via MCP client with circuit breaker protection
        console.log(`[${traceId}] Executing provider tool via MCP: ${toolCall.name}`);
        toolResponse = await this.circuitBreaker.execute(
          'mcp-tool-server',
          async () => this.mcpClient.executeTool(toolCall.name, toolRequest, traceId),
          async () => this.getFallbackResponse(toolCall.name),
        );
      }

      const durationMs = Date.now() - startTime;

      // Cache successful provider tool responses (skip caching for internal tools)
      if (!isInternal && toolResponse.ok) {
        await this.toolCache.cacheResult(toolCall.name, toolRequest, toolResponse);
      }

      // Extract provider from request or response (null for internal tools)
      const providerId = isInternal ? null : (toolRequest.provider || toolResponse.data?.provider || null);

      // Save tool call with trace_id, duration, provider, and is_internal flag
      await this.saveToolCall(
        sessionId,
        toolCall.name,
        toolRequest,
        toolResponse,
        traceId,
        durationMs,
        providerId,
        false,
        isInternal
      );

      // Yield formatted response
      yield* this.yieldToolResponse(toolCall.name, toolResponse, traceId);

    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[${traceId}] Tool execution failed:`, error);

      // Save failed tool call
      await this.saveToolCall(
        sessionId,
        toolCall.name,
        toolRequest,
        { ok: false, error: error.message },
        traceId,
        durationMs,
        null,
        false,
        isInternal
      );

      const debugMode = this.config.debugMode || this.config.nodeEnv === 'development';
      const errorMessage = debugMode
        ? `Failed to execute ${toolCall.name}: ${error.message}`
        : sanitizeError(error, debugMode, traceId);

      yield { type: 'error', error: errorMessage };
    }
  }

  /**
   * Yield formatted tool response based on tool type
   */
  private async *yieldToolResponse(
    toolName: string,
    response: any,
    traceId: string,
  ): AsyncGenerator<any> {
    if (!response.ok) {
      yield {
        type: 'tool_error',
        tool: toolName,
        error: response.error,
      };
      return;
    }

    switch (toolName) {
      case 'commerce.searchProducts':
        yield {
          type: 'cards',
          products: response.data.products,
          total: response.data.total,
          pagination: response.data.pagination,
        };
        break;

      case 'commerce.compareProducts':
        yield {
          type: 'comparison',
          products: response.data.products,
          matrix: response.data.comparisonMatrix,
          recommendation: response.data.recommendation,
        };
        break;

      case 'commerce.getProductById':
        yield {
          type: 'product_details',
          product: response.data,
        };
        break;

      case 'commerce.cart.addItem':
      case 'commerce.cart.updateItemQty':
      case 'commerce.cart.removeItem':
      case 'commerce.cart.getCart':
        yield {
          type: 'cart_updated',
          cart: response.data,
        };
        break;

      case 'commerce.checkout.create':
        yield {
          type: 'checkout_created',
          checkout: response.data,
        };
        break;

      case 'commerce.checkout.update':
        yield {
          type: 'checkout_updated',
          checkout: response.data,
        };
        break;

      case 'commerce.checkout.get':
        yield {
          type: 'checkout_details',
          checkout: response.data,
        };
        break;

      case 'commerce.checkout.complete':
        yield {
          type: 'order_created',
          order: response.data,
        };
        break;

      case 'commerce.checkout.cancel':
        yield {
          type: 'checkout_cancelled',
          checkout: response.data,
        };
        break;

      case 'commerce.product.estimateShipping':
      case 'commerce.product.listVariants':
      case 'commerce.promotions.get':
      case 'commerce.promotions.validateCoupon':
        yield {
          type: 'product_info',
          data: response.data,
        };
        break;

      case 'commerce.getRecommendations':
        yield {
          type: 'recommendations',
          products: response.data.recommendations,
          reason: response.data.reason,
        };
        break;

      case 'commerce.getProductReviews':
        yield {
          type: 'reviews',
          reviews: response.data.reviews,
          summary: response.data.summary,
        };
        break;

      case 'commerce.checkAvailability':
        yield {
          type: 'availability',
          data: response.data,
        };
        break;

      case 'commerce.getCatalogByCategory':
        yield {
          type: 'catalog',
          category: response.data.category,
          breadcrumb: response.data.breadcrumb,
        };
        break;

      case 'commerce.findProvidersByCategory':
        yield {
          type: 'providers',
          providers: response.data.providers,
        };
        break;

      default:
        yield {
          type: 'tool_result',
          tool: toolName,
          data: response.data,
        };
    }
  }

  /**
   * Handle clarification requests for ambiguous queries
   */
  private async *handleClarificationRequest(
    sessionId: string,
    userId: string,
    intentFrame: IntentFrame,
    traceId: string,
  ): AsyncGenerator<any> {
    await this.userContextService.setConversationState(
      sessionId,
      ConversationState.AWAITING_CLARIFICATION,
      intentFrame.intent,
    );

    const clarificationMessage = intentFrame.clarificationQuestion ||
      this.promptService.buildClarificationPrompt(intentFrame.intent, intentFrame.suggestedOptions);

    yield {
      type: 'clarification',
      question: clarificationMessage,
      options: intentFrame.suggestedOptions || [],
      intent: intentFrame.intent,
    };

    // Save clarification as assistant message
    await this.saveMessage(sessionId, 'assistant', clarificationMessage, userId);

    yield { type: 'done' };
  }

  /**
   * Get fallback response when circuit is open
   */
  private async getFallbackResponse(toolName: string): Promise<any> {
    return {
      ok: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is temporarily unavailable. Please try again in a moment.',
      },
    };
  }

  /**
   * Update user context based on tool results
   */
  private async updateUserContextFromResults(
    sessionId: string,
    intentFrame: IntentFrame,
    toolCalls: any[],
  ): Promise<void> {
    // Track search queries
    if (intentFrame.intent === Intent.PRODUCT_SEARCH && intentFrame.query) {
      const searchCall = toolCalls.find(tc => tc.name === 'commerce.searchProducts');
      const resultCount = searchCall?.result?.data?.total || 0;
      await this.userContextService.addRecentSearch(
        sessionId,
        intentFrame.query,
        intentFrame.canonicalCategoryId,
        resultCount,
      );
    }

    // Track viewed products
    const productDetailCalls = toolCalls.filter(tc => tc.name === 'commerce.getProductById');
    for (const call of productDetailCalls) {
      if (call.arguments?.productId) {
        await this.userContextService.addRecentlyViewed(sessionId, call.arguments.productId);
      }
    }

    // Update preferences from search filters
    if (intentFrame.filters) {
      await this.userContextService.updatePreferencesFromBehavior(
        sessionId,
        intentFrame.canonicalCategoryId,
        intentFrame.filters.brands?.[0],
        intentFrame.filters.priceMin || intentFrame.filters.priceMax
          ? { min: intentFrame.filters.priceMin, max: intentFrame.filters.priceMax }
          : undefined,
      );
    }
  }

  private getConversationState(intent: Intent): ConversationState {
    const stateMap: Record<Intent, ConversationState> = {
      [Intent.PRODUCT_SEARCH]: ConversationState.SEARCHING,
      [Intent.PRODUCT_COMPARE]: ConversationState.COMPARING,
      [Intent.ADD_TO_CART]: ConversationState.ADDING_TO_CART,
      [Intent.UPDATE_CART_QTY]: ConversationState.ADDING_TO_CART,
      [Intent.REMOVE_FROM_CART]: ConversationState.BROWSING,
      [Intent.CHECKOUT]: ConversationState.CHECKOUT,
      [Intent.CREATE_ORDER]: ConversationState.CHECKOUT,
      [Intent.ORDER_STATUS]: ConversationState.IDLE,
      [Intent.POLICY_QA]: ConversationState.IDLE,
      [Intent.GENERAL_CHAT]: ConversationState.IDLE,
    };
    return stateMap[intent] || ConversationState.IDLE;
  }

  private async *raceWithTimeout<T>(
    stream: AsyncGenerator<T>,
    timeoutPromise: Promise<never>,
  ): AsyncGenerator<T> {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), ms);
    });
  }

  private async buildConversationHistory(
    sessionId: string,
    userContext?: any,
  ): Promise<LLMMessage[]> {
    // Try to get from Redis cache first
    const cached = await this.redis.getSessionMessages(sessionId);
    if (cached) {
      console.log(`Using cached conversation history for session ${sessionId}`);
      return cached;
    }

    // Fall back to MongoDB
    const rows = await this.chatMessageModel
      .find({ session_id: sessionId })
      .sort({ created_at: -1 })
      .limit(10)
      .lean()
      .exec();

    // Build system prompt with context
    const systemPrompt = this.promptService.buildSystemPrompt(userContext);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    rows.reverse().forEach((row: any) => {
      messages.push({
        role: row.role as 'user' | 'assistant',
        content: row.content_text,
      });
    });

    // Cache the conversation history (TTL: 1 hour)
    await this.redis.cacheSessionMessages(sessionId, messages, 3600);

    return messages;
  }

  private async saveMessage(sessionId: string, role: string, content: string, userId?: string) {
    await this.chatMessageModel.create({
      message_id: uuidv4(),
      session_id: sessionId,
      user_id: userId,
      role,
      content_text: content,
      content_json: {},
    });
  }

  private async saveToolCall(
    sessionId: string,
    toolName: string,
    request: any,
    response: any,
    traceId?: string,
    durationMs?: number,
    providerId?: string,
    cached: boolean = false,
    isInternal: boolean = false,
  ) {
    await this.db.query(
      `INSERT INTO tool_calls (id, session_id, tool_name, request_json, response_json, success, trace_id, duration_ms, provider_id, cached, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        uuidv4(),
        sessionId,
        toolName,
        JSON.stringify(request),
        JSON.stringify(response),
        response.ok || false,
        traceId || null,
        durationMs || null,
        providerId || null,
        cached,
        isInternal,
      ],
    );
  }

  /**
   * Check if multi-agent mode is enabled
   * Can be configured via database or environment variable
   */
  private async isMultiAgentEnabled(): Promise<boolean> {
    try {
      // Check environment variable first
      if (process.env.USE_MULTI_AGENT === 'true') {
        return true;
      }

      // Check database configuration
      const config = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'features.multiAgent'"
      );

      return config?.value?.enabled === true;
    } catch {
      // Default to false if config not found or error occurs
      return false;
    }
  }

  /**
   * Process message using multi-agent orchestration
   * Routes to Leader Agent which coordinates specialized agents
   */
  private async *processWithMultiAgent(
    sessionId: string,
    userId: string,
    userMessage: string,
    traceId: string,
  ): AsyncGenerator<any> {
    try {
      // Get user context
      const userContext = await this.userContextService.getOrCreateContext(userId, sessionId);

      // Save user message
      await this.saveMessage(sessionId, 'user', userMessage, userId);

      // Create agent task
      const task: AgentTask = {
        id: uuidv4(),
        type: 'USER_MESSAGE',
        intent: Intent.GENERAL_CHAT, // Will be detected by Leader Agent
        context: userContext,
        parameters: {
          message: userMessage,
          query: userMessage,
          userMessage,
        },
        priority: 1,
        metadata: {
          traceId,
          depth: 0,
          callChain: [],
        },
      };

      // Initialize shared context if available
      if (this.sharedContext) {
        await this.sharedContext.getOrCreateContext(sessionId, userId, userContext);
      }

      // Execute task through agent registry (will route to Leader Agent)
      let assistantMessage = '';
      let chunks: any[] = [];

      for await (const chunk of this.agentRegistry!.executeTask(task)) {
        // Yield chunk to client
        yield chunk;

        // Collect chunks for saving
        if (chunk.type === 'token' && chunk.content) {
          assistantMessage += chunk.content;
        }
        chunks.push(chunk);
      }

      // Save assistant message
      if (assistantMessage) {
        await this.saveMessage(sessionId, 'assistant', assistantMessage, userId);
      }

      // Update trace state
      await this.redis.cacheTraceState(traceId, {
        sessionId,
        userId,
        status: 'completed',
        timestamp: new Date().toISOString(),
        mode: 'multi-agent',
      });

      yield { type: 'done' };
    } catch (error) {
      console.error(`[${traceId}] Multi-agent processing error:`, error);
      const debugMode = this.config.debugMode || this.config.nodeEnv === 'development';
      yield { type: 'error', error: sanitizeError(error, debugMode, traceId) };
      yield { type: 'done' };
    }
  }
}
