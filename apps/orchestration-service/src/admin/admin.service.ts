import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { AgentRegistryService } from '../orchestrator/agents/agent-registry.service';

@Injectable()
export class AdminService {
  constructor(
    private db: DatabaseService,
    private agentRegistry: AgentRegistryService,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [
        totalSessions,
        activeSessions,
        totalMessages,
        totalOrders,
        totalToolCalls,
        errorRate,
        recentActivity,
      ] = await Promise.all([
        this.db.queryOne<any>('SELECT COUNT(*) as count FROM chat_sessions'),
        this.db.queryOne<any>(
          "SELECT COUNT(*) as count FROM chat_sessions WHERE updated_at > NOW() - INTERVAL '1 hour'"
        ),
        this.db.queryOne<any>('SELECT COUNT(*) as count FROM chat_messages'),
        this.db.queryOne<any>('SELECT COUNT(*) as count FROM orders'),
        this.db.queryOne<any>('SELECT COUNT(*) as count FROM tool_calls'),
        this.db.queryOne<any>(
          'SELECT (COUNT(*) FILTER (WHERE success = false))::float / NULLIF(COUNT(*), 0) as rate FROM tool_calls'
        ),
        this.db.query(
          `SELECT tc.created_at as timestamp, tc.tool_name, tc.success,
                  CASE
                    WHEN tc.success THEN 'Tool call succeeded: ' || tc.tool_name
                    ELSE 'Tool call failed: ' || tc.tool_name
                  END as message,
                  tc.tool_name as type
           FROM tool_calls tc
           ORDER BY tc.created_at DESC
           LIMIT 10`
        ),
      ]);

      const avgResponseTime = await this.db.queryOne<any>(
        'SELECT AVG(duration_ms) as avg FROM tool_calls WHERE duration_ms IS NOT NULL'
      );

      const topCategories = await this.db.query(
        `SELECT
           request_json->>'category' as category,
           COUNT(*) as count
         FROM tool_calls
         WHERE tool_name = 'commerce.searchProducts'
           AND request_json->>'category' IS NOT NULL
           AND created_at > NOW() - INTERVAL '7 days'
         GROUP BY request_json->>'category'
         ORDER BY count DESC
         LIMIT 5`
      );

      const revenueResult = await this.db.queryOne<any>(
        "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status IN ('COMPLETED', 'DELIVERED')"
      );

      return {
        activeSessions: parseInt(activeSessions.count) || 0,
        totalMessages: parseInt(totalMessages.count) || 0,
        totalOrders: parseInt(totalOrders.count) || 0,
        totalRevenue: parseFloat(revenueResult.revenue) || 0,
        avgResponseTime: parseFloat(avgResponseTime.avg) || 0,
        errorRate: parseFloat(errorRate.rate) || 0,
        topCategories: topCategories.map(tc => ({
          category: tc.category || 'Unknown',
          count: parseInt(tc.count) || 0
        })),
        recentActivity: recentActivity.map(ra => ({
          timestamp: ra.timestamp,
          type: ra.type || 'tool_call',
          message: ra.message
        }))
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error.message);
      return {
        activeSessions: 0,
        totalMessages: 0,
        totalOrders: 0,
        totalRevenue: 0,
        avgResponseTime: 0,
        errorRate: 0,
        topCategories: [],
        recentActivity: [],
        error: 'Database temporarily unavailable. Please try again later.'
      };
    }
  }

  /**
   * Get LLM configuration
   */
  async getLLMConfig() {
    const configs = await this.db.query(
      "SELECT key, value FROM admin_configs WHERE category = 'llm'"
    );
    return configs.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  /**
   * Update LLM configuration
   */
  async updateLLMConfig(key: string, value: any) {
    await this.db.query(
      `INSERT INTO admin_configs (key, category, value)
       VALUES ($1, 'llm', $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    return { status: 'updated' };
  }

  /**
   * Get taxonomy (category structure)
   */
  async getTaxonomy() {
    const config = await this.db.queryOne<any>(
      "SELECT value FROM admin_configs WHERE key = 'taxonomy.categories'"
    );
    return config?.value || {};
  }

  /**
   * Update taxonomy
   */
  async updateTaxonomy(taxonomy: any) {
    await this.db.query(
      `UPDATE admin_configs SET value = $1::jsonb, updated_at = NOW()
       WHERE key = 'taxonomy.categories'`,
      [JSON.stringify(taxonomy)]
    );
    return { status: 'updated' };
  }

  /**
   * Get brands dictionary
   */
  async getBrands() {
    const config = await this.db.queryOne<any>(
      "SELECT value FROM admin_configs WHERE key = 'taxonomy.brands'"
    );
    return config?.value || {};
  }

  /**
   * Update brands dictionary
   */
  async updateBrands(brands: any) {
    await this.db.query(
      `UPDATE admin_configs SET value = $1::jsonb, updated_at = NOW()
       WHERE key = 'taxonomy.brands'`,
      [JSON.stringify(brands)]
    );
    return { status: 'updated' };
  }

  /**
   * Get provider configuration
   */
  async getProviderConfig() {
    const configs = await this.db.query(
      "SELECT key, value FROM admin_configs WHERE category = 'provider'"
    );
    return configs.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(key: string, value: any) {
    await this.db.query(
      `INSERT INTO admin_configs (key, category, value)
       VALUES ($1, 'provider', $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    return { status: 'updated' };
  }

  /**
   * Get chat sessions with message counts
   */
  async getSessions(limit: number = 50, offset: number = 0) {
    return this.db.query(
      `SELECT s.id, s.user_id, s.created_at, s.updated_at,
              COUNT(m.id) as message_count
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON m.session_id = s.id
       GROUP BY s.id
       ORDER BY s.updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }

  /**
   * Get error logs from tool calls
   */
  async getErrorLogs(limit: number = 100) {
    return this.db.query(
      `SELECT id, tool_name, request_json, response_json, created_at
       FROM tool_calls
       WHERE success = false
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Get users list
   */
  async getUsers(limit: number = 50, offset: number = 0) {
    return this.db.query(
      `SELECT id, username, role, status, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    return this.db.query(
      `SELECT id, created_at, updated_at,
              (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.id) as message_count
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
  }

  /**
   * Sync new UCP tools to database
   */
  async syncNewUcpTools() {
    const newTools = [
      { id: 'commerce.checkout.create', display_name: 'Create Checkout Session', description: 'Create checkout session from cart with frozen prices', category: 'commerce' },
      { id: 'commerce.checkout.update', display_name: 'Update Checkout Session', description: 'Update checkout with shipping/payment info', category: 'commerce' },
      { id: 'commerce.checkout.get', display_name: 'Get Checkout Session', description: 'Retrieve checkout session details', category: 'commerce' },
      { id: 'commerce.checkout.complete', display_name: 'Complete Checkout', description: 'Complete checkout and create order (HITL for >₹50k)', category: 'commerce' },
      { id: 'commerce.checkout.cancel', display_name: 'Cancel Checkout', description: 'Cancel an active checkout session', category: 'commerce' },
      { id: 'commerce.product.estimateShipping', display_name: 'Estimate Shipping', description: 'Estimate shipping cost and delivery time', category: 'commerce' },
      { id: 'commerce.product.listVariants', display_name: 'List Product Variants', description: 'Get all product variants with pricing', category: 'commerce' },
      { id: 'commerce.promotions.get', display_name: 'Get Promotions', description: 'Get active promotions for a product', category: 'commerce' },
      { id: 'commerce.promotions.validateCoupon', display_name: 'Validate Coupon', description: 'Validate coupon and calculate discount', category: 'commerce' }
    ];

    for (const tool of newTools) {
      await this.db.query(
        `INSERT INTO ucp_tools (id, display_name, description, category, enabled, is_internal, tool_type)
         VALUES ($1, $2, $3, $4, true, false, 'provider_api')
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           enabled = true,
           updated_at = NOW()`,
        [tool.id, tool.display_name, tool.description, tool.category]
      );
    }

    return { status: 'synced', count: newTools.length };
  }

  /**
   * Get all registered agents with their metadata
   */
  async getAgents() {
    try {
      const agents = this.agentRegistry.getAllAgents();

      return agents.map(agent => ({
        name: agent.name,
        capabilities: agent.capabilities,
        priority: agent.priority,
        description: this.getAgentDescription(agent.name),
        systemPrompt: this.getAgentSystemPrompt(agent.name),
        allowedDelegations: (agent as any).allowedDelegations || [],
        maxDelegations: (agent as any).maxDelegations || 3,
        maxTaskDepth: (agent as any).maxTaskDepth || 5,
      }));
    } catch (error) {
      console.error('Failed to fetch agents:', error.message);
      return [];
    }
  }

  /**
   * Get agent description based on implementation
   */
  private getAgentDescription(agentName: string): string {
    const descriptions: Record<string, string> = {
      LeaderAgent: 'Main orchestrator for all user requests. Routes requests to specialized agents, maintains conversation flow, and aggregates multi-agent responses.',
      ProductBrowsingAgent: 'Handles product search and discovery with parallel multi-provider searches (4x faster). Includes deduplication, relevance ranking, and product comparison.',
      ShoppingAgent: 'Manages cart operations including add, update, remove items, and view cart contents. Validates product availability before cart operations.',
      CheckoutAgent: 'Handles checkout process and order creation (not yet implemented in POC).',
      ReasoningAgent: 'Performs complex decision making and chain-of-thought reasoning (not yet implemented in POC).',
      CustomerSupportAgent: 'Handles customer support queries and order tracking (not yet implemented in POC).',
      AnalyticsAgent: 'Tracks user behavior and provides analytics (not yet implemented in POC).',
    };

    return descriptions[agentName] || 'No description available';
  }

  /**
   * Get agent system prompt based on implementation
   */
  private getAgentSystemPrompt(agentName: string): string {
    const prompts: Record<string, string> = {
      LeaderAgent: `You are the Leader Agent, the main orchestrator for all user requests in a multi-agent commerce system.

Your responsibilities:
- Detect user intent from natural language queries
- Route requests to specialized agents based on intent
- Maintain conversation context and flow
- Handle clarifications and follow-up questions
- Aggregate responses from multiple agents
- Fall back to general chat when no specialized agent is available

Intent routing:
- PRODUCT_SEARCH, PRODUCT_COMPARE → ProductBrowsingAgent
- ADD_TO_CART, UPDATE_CART_QTY, REMOVE_FROM_CART → ShoppingAgent
- CHECKOUT, CREATE_ORDER → CheckoutAgent
- ORDER_STATUS, POLICY_QA → CustomerSupportAgent
- GENERAL_CHAT → Handle directly with friendly responses

Always maintain a helpful and professional tone. When delegating to agents, wait for their response before proceeding.`,

      ProductBrowsingAgent: `You are the Product Browsing Agent, specialized in product search and discovery.

Your responsibilities:
- Execute parallel multi-provider product searches (4x faster than sequential)
- Deduplicate products across providers using name/brand similarity
- Rank results by relevance to user query
- Handle product comparison requests
- Gracefully handle provider failures

Search optimization:
- Use Promise.allSettled for parallel execution
- Prefer products with higher ratings when deduplicating
- Rank by: exact match (10pts), term match (3pts), brand match (5pts), rating boost (0-5pts), in-stock (2pts)

When searching, always:
1. Fetch enabled providers from database
2. Execute searches simultaneously across all providers
3. Aggregate and deduplicate results
4. Rank by relevance
5. Return top 20 results with clear formatting`,

      ShoppingAgent: `You are the Shopping Agent, specialized in cart management operations.

Your responsibilities:
- Add items to cart with quantity validation
- Update cart item quantities
- Remove items from cart
- View cart contents and totals
- Validate product availability before operations

Always:
- Confirm successful operations with clear messages
- Include updated cart state in responses
- Use idempotency keys to prevent duplicate operations
- Handle errors gracefully with user-friendly messages

Cart operations flow:
1. Validate required parameters (productId, quantity, etc.)
2. Execute MCP tool call (commerce.cart.*)
3. Check result status
4. Return formatted response with action confirmation`,

      CheckoutAgent: 'System prompt not available - agent not yet implemented in POC.',
      ReasoningAgent: 'System prompt not available - agent not yet implemented in POC.',
      CustomerSupportAgent: 'System prompt not available - agent not yet implemented in POC.',
      AnalyticsAgent: 'System prompt not available - agent not yet implemented in POC.',
    };

    return prompts[agentName] || 'System prompt not available';
  }
}
