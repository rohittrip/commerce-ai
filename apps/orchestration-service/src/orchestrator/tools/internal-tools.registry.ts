import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { IntentService } from '../intent/intent.service';
import { randomUUID } from 'crypto';

interface InternalToolHandler {
  name: string;
  handler: (args: any) => Promise<any>;
}

@Injectable()
export class InternalToolsRegistry {
  private tools: Map<string, InternalToolHandler> = new Map();

  constructor(
    private db: DatabaseService,
    private intentService: IntentService,
  ) {
    this.registerTools();
  }

  private registerTools() {
    // Orchestrator tools - system metadata and management
    this.register('orchestrator.getProviders', this.getProviders.bind(this));
    this.register('orchestrator.getTools', this.getTools.bind(this));
    this.register('orchestrator.getMetadata', this.getMetadata.bind(this));
    this.register('orchestrator.detectIntent', this.detectIntent.bind(this));
    this.register('orchestrator.handleError', this.handleError.bind(this));

    // Thinking tools - chain-of-thought reasoning
    this.register('thinking.createChainRun', this.createChainRun.bind(this));
    this.register('thinking.addChainStep', this.addChainStep.bind(this));
    this.register('thinking.completeChainRun', this.completeChainRun.bind(this));
  }

  private register(name: string, handler: (args: any) => Promise<any>) {
    this.tools.set(name, { name, handler });
  }

  /**
   * Execute an internal tool by name
   */
  async execute(toolName: string, args: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Internal tool not found: ${toolName}`);
    }
    return await tool.handler(args);
  }

  /**
   * Check if a tool is an internal tool
   */
  isInternalTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get list of all registered internal tools
   */
  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys());
  }

  // ==================== Orchestrator Tool Implementations ====================

  /**
   * Get all active providers with capabilities
   */
  private async getProviders(args: any): Promise<any> {
    const whereClause = args.enabled !== undefined
      ? 'WHERE enabled = $1'
      : '';
    const params = args.enabled !== undefined ? [args.enabled] : [];

    const providers = await this.db.query(
      `SELECT id, name, type, capabilities, enabled, config
       FROM providers ${whereClause}
       ORDER BY name`,
      params
    );

    return {
      ok: true,
      data: {
        providers: providers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          capabilities: p.capabilities || [],
          enabled: p.enabled,
          config: p.config || {}
        })),
        total: providers.length
      }
    };
  }

  /**
   * Get all available UCP tools
   */
  private async getTools(args: any): Promise<any> {
    const whereConditions = ['enabled = true'];
    const params: any[] = [];
    let paramIndex = 1;

    if (args.filter) {
      whereConditions.push(
        `(id ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      params.push(`%${args.filter}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const tools = await this.db.query(
      `SELECT id, display_name, description, category, tool_type, is_internal
       FROM ucp_tools
       WHERE ${whereClause}
       ORDER BY category, display_name`,
      params
    );

    return {
      ok: true,
      data: {
        tools: tools.map(t => ({
          id: t.id,
          displayName: t.display_name,
          description: t.description,
          category: t.category,
          toolType: t.tool_type,
          isInternal: t.is_internal
        })),
        total: tools.length
      }
    };
  }

  /**
   * Get system metadata (providers, tools, categories)
   */
  private async getMetadata(args: { type: string }): Promise<any> {
    switch (args.type) {
      case 'providers':
        return this.getProviders({});

      case 'tools':
        return this.getTools({});

      case 'categories':
        return this.getCategories();

      default:
        throw new Error(`Unknown metadata type: ${args.type}`);
    }
  }

  /**
   * Get predefined categories
   */
  private async getCategories(): Promise<any> {
    const config = await this.db.queryOne<any>(
      "SELECT value FROM admin_configs WHERE key = 'taxonomy.categories'"
    );

    return {
      ok: true,
      data: config?.value || {
        electronics: { name: 'Electronics', description: 'Electronic devices and accessories' },
        fashion: { name: 'Fashion', description: 'Clothing and accessories' },
        home: { name: 'Home & Kitchen', description: 'Home and kitchen items' },
        beauty: { name: 'Beauty', description: 'Beauty and personal care' },
        sports: { name: 'Sports', description: 'Sports and fitness equipment' },
      }
    };
  }

  /**
   * Detect user intent from query
   */
  private async detectIntent(args: { query: string; context?: any }): Promise<any> {
    try {
      const intent = await this.intentService.detectIntent(
        args.query,
        args.context
      );

      return {
        ok: true,
        data: {
          intent: intent.intent || 'unknown',
          confidence: intent.confidence || 0,
          entities: intent.entities || {},
          canonicalCategoryId: intent.canonicalCategoryId || null,
          needsClarification: intent.needClarification || false
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'INTENT_DETECTION_FAILED',
          message: error.message || 'Failed to detect intent'
        }
      };
    }
  }

  /**
   * Handle error with recovery suggestions
   */
  private async handleError(args: { error: any; context?: any }): Promise<any> {
    const errorCode = args.error.code || 'UNKNOWN_ERROR';
    const errorMessage = args.error.message || 'An unknown error occurred';

    // Generate recovery suggestions based on error type
    const suggestions = this.generateRecoverySuggestions(errorCode, errorMessage);

    return {
      ok: true,
      data: {
        errorCode,
        message: errorMessage,
        suggestions,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate recovery suggestions for errors
   */
  private generateRecoverySuggestions(errorCode: string, errorMessage: string): string[] {
    const suggestions: string[] = [];

    if (errorMessage.includes('timeout') || errorCode.includes('TIMEOUT')) {
      suggestions.push('Retry the request');
      suggestions.push('Check network connectivity');
      suggestions.push('Try with a simpler query');
    }

    if (errorMessage.includes('not found') || errorCode.includes('NOT_FOUND')) {
      suggestions.push('Check if the resource ID is correct');
      suggestions.push('Verify the resource exists');
      suggestions.push('Try searching for the resource first');
    }

    if (errorMessage.includes('unauthorized') || errorCode.includes('UNAUTHORIZED')) {
      suggestions.push('Check authentication credentials');
      suggestions.push('Verify API key is valid');
      suggestions.push('Ensure user has necessary permissions');
    }

    if (errorMessage.includes('rate limit') || errorCode.includes('RATE_LIMIT')) {
      suggestions.push('Wait before retrying');
      suggestions.push('Reduce request frequency');
      suggestions.push('Check rate limit quotas');
    }

    if (suggestions.length === 0) {
      suggestions.push('Retry the operation');
      suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
  }

  // ==================== Thinking Tool Implementations ====================

  /**
   * Create a new thinking chain run
   */
  private async createChainRun(args: { sessionId: string; userId: string; metadata?: any }): Promise<any> {
    const runId = randomUUID();
    const traceId = randomUUID();

    await this.db.query(
      `INSERT INTO chain_runs (id, session_id, user_id, trace_id, status, meta_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        runId,
        args.sessionId,
        args.userId,
        traceId,
        'running',
        JSON.stringify(args.metadata || {})
      ]
    );

    return {
      ok: true,
      data: {
        runId,
        traceId,
        status: 'running',
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Add a step to a thinking chain run
   */
  private async addChainStep(args: { runId: string; stage: string; content: any }): Promise<any> {
    const stepId = randomUUID();

    // Get next step index for this run
    const result = await this.db.queryOne<any>(
      'SELECT COALESCE(MAX(step_index), -1) + 1 as next_index FROM chain_steps WHERE run_id = $1',
      [args.runId]
    );

    const stepIndex = result.next_index;

    await this.db.query(
      `INSERT INTO chain_steps (id, run_id, step_index, stage, content_json, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        stepId,
        args.runId,
        stepIndex,
        args.stage,
        JSON.stringify(args.content)
      ]
    );

    return {
      ok: true,
      data: {
        stepId,
        stepIndex,
        stage: args.stage,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Complete a thinking chain run
   */
  private async completeChainRun(args: { runId: string }): Promise<any> {
    // Update run status to completed
    await this.db.query(
      `UPDATE chain_runs
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      ['completed', args.runId]
    );

    // Get all steps for the run
    const steps = await this.db.query(
      `SELECT step_index, stage, content_json, created_at
       FROM chain_steps
       WHERE run_id = $1
       ORDER BY step_index`,
      [args.runId]
    );

    return {
      ok: true,
      data: {
        runId: args.runId,
        status: 'completed',
        totalSteps: steps.length,
        steps: steps.map(s => ({
          stepIndex: s.step_index,
          stage: s.stage,
          content: s.content_json,
          createdAt: s.created_at
        })),
        completedAt: new Date().toISOString()
      }
    };
  }
}
