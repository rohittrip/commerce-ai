import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseService } from '../../common/database/database.service';
import { ConfigService } from '../../common/config/config.service';
import { MongoUser } from '../../mongo/schemas/user.schema';
import { MongoChatSession } from '../../mongo/schemas/chat-session.schema';
import { MongoChatMessage } from '../../mongo/schemas/chat-message.schema';
import { OrchestratorService } from '../../orchestrator/orchestrator.service';

@Injectable()
export class AdminService {
  constructor(
    private db: DatabaseService,
    private config: ConfigService,
    private orchestratorService: OrchestratorService,
    @InjectModel(MongoUser.name) private userModel: Model<MongoUser>,
    @InjectModel(MongoChatSession.name) private chatSessionModel: Model<MongoChatSession>,
    @InjectModel(MongoChatMessage.name) private chatMessageModel: Model<MongoChatMessage>,
  ) {}

  // LLM Configuration
  async getLLMConfig() {
    const configs = await this.db.query(
      "SELECT key, value FROM admin_configs WHERE category = 'llm'"
    );
    return configs.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async updateLLMConfig(key: string, value: any) {
    await this.db.query(
      `INSERT INTO admin_configs (key, category, value) 
       VALUES ($1, 'llm', $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    return { status: 'updated' };
  }

  // Taxonomy Management
  async getTaxonomy() {
    const config = await this.db.queryOne<any>(
      "SELECT value FROM admin_configs WHERE key = 'taxonomy.categories'"
    );
    return config?.value || {};
  }

  async updateTaxonomy(taxonomy: any) {
    await this.db.query(
      `UPDATE admin_configs SET value = $1::jsonb, updated_at = NOW()
       WHERE key = 'taxonomy.categories'`,
      [JSON.stringify(taxonomy)]
    );
    return { status: 'updated' };
  }

  async getBrands() {
    const config = await this.db.queryOne<any>(
      "SELECT value FROM admin_configs WHERE key = 'taxonomy.brands'"
    );
    return config?.value || {};
  }

  async updateBrands(brands: any) {
    await this.db.query(
      `UPDATE admin_configs SET value = $1::jsonb, updated_at = NOW()
       WHERE key = 'taxonomy.brands'`,
      [JSON.stringify(brands)]
    );
    return { status: 'updated' };
  }

  // Provider Configuration
  async getProviderConfig() {
    const configs = await this.db.query(
      "SELECT key, value FROM admin_configs WHERE category = 'provider'"
    );
    return configs.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async updateProviderConfig(key: string, value: any) {
    await this.db.query(
      `INSERT INTO admin_configs (key, category, value) 
       VALUES ($1, 'provider', $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    return { status: 'updated' };
  }

  // Sync new UCP tools to database
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
        `INSERT INTO ucp_tools (id, display_name, description, category, enabled, request_schema, response_schema, version)
         VALUES ($1, $2, $3, $4, true, '{}'::jsonb, '{}'::jsonb, 1)
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

  // Tool Testing (uses gRPC when ORCHESTRATOR_GRPC_URL is set, else HTTP)
  async testTool(toolName: string, request: any) {
    try {
      const response = await this.orchestratorService.testTool(toolName, request ?? {});
      return {
        status: 'success',
        response,
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error?.response?.data?.message || error?.message || String(error),
      };
    }
  }

  // Monitoring
  async getDashboardStats() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const [
        mongoSessionCounts,
        mongoMessageCount,
        totalOrders,
        totalToolCalls,
        errorRate,
        recentActivity,
      ] = await Promise.all([
        Promise.all([
          this.chatSessionModel.countDocuments().exec(),
          this.chatSessionModel.countDocuments({ last_active_at: { $gte: oneHourAgo } }).exec(),
        ]),
        this.chatMessageModel.countDocuments().exec(),
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

      const [totalSessions, activeSessions] = mongoSessionCounts;

      // Calculate avg response time from tool calls
      const avgResponseTime = await this.db.queryOne<any>(
        'SELECT AVG(duration_ms) as avg FROM tool_calls WHERE duration_ms IS NOT NULL'
      );

      // Get top categories from recent searches
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

      // Calculate total revenue from completed orders
      const revenueResult = await this.db.queryOne<any>(
        "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status IN ('COMPLETED', 'DELIVERED')"
      );

      return {
        activeSessions: activeSessions || 0,
        totalMessages: mongoMessageCount || 0,
        totalOrders: parseInt(totalOrders?.count) || 0,
        totalRevenue: parseFloat(revenueResult?.revenue) || 0,
        avgResponseTime: parseFloat(avgResponseTime?.avg) || 0,
        errorRate: parseFloat(errorRate?.rate) || 0,
        topCategories: (topCategories || []).map((tc: any) => ({
          category: tc.category || 'Unknown',
          count: parseInt(tc.count) || 0
        })),
        recentActivity: (recentActivity || []).map((ra: any) => ({
          timestamp: ra.timestamp,
          type: ra.type || 'tool_call',
          message: ra.message
        }))
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error.message);
      // Return empty stats if database is unavailable
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

  async getSessions(limit: number = 50, offset: number = 0) {
    const sessions = await this.chatSessionModel
      .find()
      .sort({ last_active_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();

    const result = await Promise.all(
      sessions.map(async (s) => {
        const message_count = await this.chatMessageModel
          .countDocuments({
            $or: [{ chat_session_id: s.chat_session_id }, { sessionId: s.chat_session_id }],
          })
          .exec();
        return {
          id: s.chat_session_id,
          user_id: s.user_id,
          created_at: s.created_at,
          updated_at: s.last_active_at,
          message_count,
        };
      })
    );
    return result;
  }

  async getToolCallStats() {
    return this.db.query(
      `SELECT tool_name, 
              COUNT(*) as total_calls,
              COUNT(*) FILTER (WHERE success = true) as successful_calls,
              COUNT(*) FILTER (WHERE success = false) as failed_calls,
              AVG(duration_ms) as avg_duration_ms
       FROM tool_calls
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY tool_name
       ORDER BY total_calls DESC`
    );
  }

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

  // User Management (Mongo users collection)
  async getUsers(limit: number = 50, offset: number = 0) {
    const users = await this.userModel
      .find()
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();
    return users.map((u) => ({
      id: u.user_id ?? (u as any)._id?.toString(),
      username: u.full_name || u.email || `${u.phone_country}${u.phone_number}`,
      role: u.role || 'customer',
      status: u.status || 'active',
      created_at: u.created_at,
    }));
  }

  async getUserSessions(userId: string) {
    const sessions = await this.chatSessionModel
      .find({ user_id: userId })
      .sort({ last_active_at: -1 })
      .lean()
      .exec();

    const result = await Promise.all(
      sessions.map(async (s) => {
        const message_count = await this.chatMessageModel
          .countDocuments({
            $or: [{ chat_session_id: s.chat_session_id }, { sessionId: s.chat_session_id }],
          })
          .exec();
        return {
          id: s.chat_session_id,
          created_at: s.created_at,
          updated_at: s.last_active_at,
          message_count,
        };
      })
    );
    return result;
  }

  // Provider Management
  async getProviders() {
    const providers = await this.db.query(
      `SELECT * FROM providers ORDER BY name`
    );

    // Helper to flatten nested field mappings
    const flattenFieldMappings = (mappings: any) => {
      const flat: Record<string, string> = {};
      if (mappings && typeof mappings === 'object') {
        Object.entries(mappings).forEach(([category, fields]: [string, any]) => {
          if (typeof fields === 'object') {
            Object.entries(fields).forEach(([key, value]: [string, any]) => {
              flat[`${category}.${key}`] = String(value);
            });
          }
        });
      }
      return flat;
    };

    // Transform DB schema to match frontend expectations
    return providers.map(p => {
      // Define all possible capabilities
      const allCapabilities = ['SEARCH', 'DETAILS', 'CART', 'ORDER'];
      const enabledCaps = (p.capabilities || []).map((c: string) => c.toUpperCase());

      return {
        providerId: p.id,
        providerName: p.name,
        displayName: p.name,
        enabled: p.enabled,
        capabilities: allCapabilities.map(cap => ({
          name: cap,
          enabled: enabledCaps.includes(cap),
          description: `${cap.toLowerCase()} capability`
        })),
        config: p.config || {},
        toolConfigs: p.tool_configs || {},
        mappings: {
          categoryMappings: p.category_mappings || {},
          fieldMappings: flattenFieldMappings(p.field_mappings)
        },
        credentials: p.api_key ? {
          apiKey: p.api_key,
          endpoint: p.base_url
        } : undefined,
        metadata: {
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }
      };
    });
  }

  async getProvider(providerId: string) {
    const p = await this.db.queryOne(
      `SELECT * FROM providers WHERE id = $1`,
      [providerId]
    );

    if (!p) return null;

    // Helper to flatten nested field mappings
    const flattenFieldMappings = (mappings: any) => {
      const flat: Record<string, string> = {};
      if (mappings && typeof mappings === 'object') {
        Object.entries(mappings).forEach(([category, fields]: [string, any]) => {
          if (typeof fields === 'object') {
            Object.entries(fields).forEach(([key, value]: [string, any]) => {
              flat[`${category}.${key}`] = String(value);
            });
          }
        });
      }
      return flat;
    };

    // Define all possible capabilities
    const allCapabilities = ['SEARCH', 'DETAILS', 'CART', 'ORDER'];
    const enabledCaps = (p.capabilities || []).map((c: string) => c.toUpperCase());

    // Transform DB schema to match frontend expectations
    return {
      providerId: p.id,
      providerName: p.name,
      displayName: p.name,
      enabled: p.enabled,
      capabilities: allCapabilities.map(cap => ({
        name: cap,
        enabled: enabledCaps.includes(cap),
        description: `${cap.toLowerCase()} capability`
      })),
      config: p.config || {},
      toolConfigs: p.tool_configs || {},
      mappings: {
        categoryMappings: p.category_mappings || {},
        fieldMappings: flattenFieldMappings(p.field_mappings)
      },
      credentials: p.api_key ? {
        apiKey: p.api_key,
        endpoint: p.base_url
      } : undefined,
      metadata: {
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    };
  }

  async updateProvider(providerId: string, config: any) {
    // Convert capabilities from frontend format to DB format
    let capabilitiesArray = null;
    if (config.capabilities) {
      capabilitiesArray = config.capabilities
        .filter((cap: any) => cap.enabled)
        .map((cap: any) => cap.name.toLowerCase());
    }

    await this.db.query(
      `UPDATE providers 
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           base_url = COALESCE($4, base_url),
           api_key = COALESCE($5, api_key),
           enabled = COALESCE($6, enabled),
           config = COALESCE($7::jsonb, config),
           capabilities = COALESCE($8::text[], capabilities),
           updated_at = NOW()
       WHERE id = $1`,
      [
        providerId,
        config.name,
        config.type,
        config.base_url,
        config.api_key,
        config.enabled,
        config.config ? JSON.stringify(config.config) : null,
        capabilitiesArray
      ]
    );
    return this.getProvider(providerId);
  }

  async updateProviderMappings(providerId: string, mappings: any) {
    // Helper to unflatten field mappings from UI format to DB nested format
    const unflattenFieldMappings = (flat: Record<string, string>) => {
      const nested: any = {};
      Object.entries(flat).forEach(([key, value]) => {
        const parts = key.split('.');
        if (parts.length === 2) {
          const [category, field] = parts;
          if (!nested[category]) {
            nested[category] = {};
          }
          nested[category][field] = value;
        }
      });
      return nested;
    };

    const fieldMappings = unflattenFieldMappings(mappings.fieldMappings || {});
    const categoryMappings = mappings.categoryMappings || {};

    await this.db.query(
      `UPDATE providers 
       SET field_mappings = $2::jsonb,
           category_mappings = $3::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [providerId, JSON.stringify(fieldMappings), JSON.stringify(categoryMappings)]
    );
    return { status: 'updated' };
  }

  async getProviderStats(providerId: string) {
    const stats = await this.db.queryOne(
      `SELECT 
         COUNT(*) FILTER (WHERE success = true) as successful_calls,
         COUNT(*) FILTER (WHERE success = false) as failed_calls,
         AVG(duration_ms) as avg_response_time,
         MAX(created_at) as last_call_at
       FROM tool_calls
       WHERE provider_id = $1
         AND created_at > NOW() - INTERVAL '30 days'`,
      [providerId]
    );

    const successfulCalls = parseInt(stats?.successful_calls || 0);
    const failedCalls = parseInt(stats?.failed_calls || 0);
    const totalCalls = successfulCalls + failedCalls;

    return {
      providerId,
      totalRequests: totalCalls,
      successRate: totalCalls > 0 ? successfulCalls / totalCalls : 0,
      avgResponseTime: parseFloat(stats?.avg_response_time || 0),
      lastError: null,
      lastErrorTime: null
    };
  }

  async testProviderConnection(providerId: string) {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        return { success: false, message: 'Provider not found' };
      }

      // Test basic connectivity by calling orchestration service
      const details = await this.orchestratorService.testTool('commerce.searchProducts', {
        query: 'test',
        limit: 1,
        providerId,
      });

      return {
        success: true,
        message: 'Connection successful',
        details,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Connection failed'
      };
    }
  }

  // Tool Configuration Management
  async updateToolConfig(providerId: string, toolName: string, config: any) {
    // Get current tool_configs
    const provider = await this.db.queryOne<any>(
      `SELECT tool_configs FROM providers WHERE id = $1`,
      [providerId]
    );

    const toolConfigs = provider?.tool_configs || {};
    toolConfigs[toolName] = {
      ...toolConfigs[toolName],
      ...config,
    };

    await this.db.query(
      `UPDATE providers
       SET tool_configs = $2::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [providerId, JSON.stringify(toolConfigs)]
    );

    return { status: 'updated', toolName, config: toolConfigs[toolName] };
  }

  // Tool Schema Management
  async getToolSchema(providerId: string, toolName: string, schemaType: string) {
    const schema = await this.db.queryOne<any>(
      `SELECT * FROM tool_schemas
       WHERE provider_id = $1 AND tool_name = $2 AND schema_type = $3`,
      [providerId, toolName, schemaType]
    );

    if (!schema) {
      // Try to get default schema
      const defaultSchema = await this.getDefaultToolSchema(toolName, schemaType);
      return {
        providerId,
        toolName,
        schemaType,
        schemaContent: defaultSchema,
        isCustom: false,
        version: 0,
      };
    }

    return {
      providerId: schema.provider_id,
      toolName: schema.tool_name,
      schemaType: schema.schema_type,
      schemaContent: schema.schema_content,
      isCustom: schema.is_custom,
      version: schema.version,
      updatedAt: schema.updated_at,
    };
  }

  async uploadToolSchema(providerId: string, toolName: string, schemaType: string, schema: any) {
    // Validate that the schema is valid JSON
    if (typeof schema !== 'object') {
      throw new Error('Invalid schema: must be a valid JSON object');
    }

    await this.db.query(
      `INSERT INTO tool_schemas (provider_id, tool_name, schema_type, schema_content, is_custom, version)
       VALUES ($1, $2, $3, $4::jsonb, true, 1)
       ON CONFLICT (provider_id, tool_name, schema_type)
       DO UPDATE SET
         schema_content = $4::jsonb,
         version = tool_schemas.version + 1,
         is_custom = true,
         updated_at = NOW()`,
      [providerId, toolName, schemaType, JSON.stringify(schema)]
    );

    return this.getToolSchema(providerId, toolName, schemaType);
  }

  async resetToolSchema(providerId: string, toolName: string, schemaType: string) {
    await this.db.query(
      `DELETE FROM tool_schemas
       WHERE provider_id = $1 AND tool_name = $2 AND schema_type = $3`,
      [providerId, toolName, schemaType]
    );

    return { status: 'reset', toolName, schemaType };
  }

  async getDefaultToolSchema(toolName: string, schemaType: string) {
    // Return default schemas for known tools
    const defaultSchemas: Record<string, Record<string, any>> = {
      'commerce.searchProducts': {
        request: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Search query" },
            "category": { "type": "string", "description": "Category filter" },
            "filters": { "type": "object", "description": "Additional filters" },
            "pagination": {
              "type": "object",
              "properties": {
                "page": { "type": "integer", "minimum": 1 },
                "pageSize": { "type": "integer", "minimum": 1, "maximum": 100 }
              }
            },
            "sort": {
              "type": "object",
              "properties": {
                "field": { "type": "string" },
                "direction": { "type": "string", "enum": ["asc", "desc"] }
              }
            }
          },
          "required": ["query"]
        },
        response: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "products": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "name": { "type": "string" },
                  "price": { "type": "number" },
                  "currency": { "type": "string" }
                }
              }
            },
            "pagination": {
              "type": "object",
              "properties": {
                "page": { "type": "integer" },
                "pageSize": { "type": "integer" },
                "totalItems": { "type": "integer" },
                "totalPages": { "type": "integer" }
              }
            }
          }
        }
      },
      'commerce.getProductDetails': {
        request: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "productId": { "type": "string", "description": "Product ID" }
          },
          "required": ["productId"]
        },
        response: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "description": { "type": "string" },
            "price": { "type": "number" },
            "currency": { "type": "string" },
            "availability": { "type": "string" }
          }
        }
      },
      'commerce.cart.addItem': {
        request: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "userId": { "type": "string" },
            "productId": { "type": "string" },
            "quantity": { "type": "integer", "minimum": 1, "maximum": 99 }
          },
          "required": ["userId", "productId", "quantity"]
        },
        response: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "cart": { "type": "object" },
            "success": { "type": "boolean" }
          }
        }
      },
      'commerce.cart.getCart': {
        request: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "userId": { "type": "string" }
          },
          "required": ["userId"]
        },
        response: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "items": { "type": "array" },
            "total": { "type": "number" }
          }
        }
      }
    };

    const toolSchemas = defaultSchemas[toolName];
    if (toolSchemas && toolSchemas[schemaType]) {
      return toolSchemas[schemaType];
    }

    // Return a generic empty schema for unknown tools
    return {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {},
      "description": `Default ${schemaType} schema for ${toolName}`
    };
  }

  // =====================================================
  // CATEGORIES MANAGEMENT
  // =====================================================

  async getCategories() {
    const categories = await this.db.query(
      `SELECT * FROM categories ORDER BY display_order, name`
    );
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      displayOrder: c.display_order,
      enabled: c.enabled,
      createdAt: c.created_at,
    }));
  }

  async getCategory(categoryId: string) {
    const category = await this.db.queryOne(
      `SELECT * FROM categories WHERE id = $1`,
      [categoryId]
    );
    if (!category) return null;
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      displayOrder: category.display_order,
      enabled: category.enabled,
      createdAt: category.created_at,
    };
  }

  async createCategory(data: { id: string; name: string; description?: string; icon?: string; displayOrder?: number }) {
    await this.db.query(
      `INSERT INTO categories (id, name, description, icon, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.id, data.name, data.description || null, data.icon || null, data.displayOrder || 0]
    );
    return this.getCategory(data.id);
  }

  async updateCategory(categoryId: string, data: { name?: string; description?: string; icon?: string; displayOrder?: number; enabled?: boolean }) {
    await this.db.query(
      `UPDATE categories SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         icon = COALESCE($4, icon),
         display_order = COALESCE($5, display_order),
         enabled = COALESCE($6, enabled)
       WHERE id = $1`,
      [categoryId, data.name, data.description, data.icon, data.displayOrder, data.enabled]
    );
    return this.getCategory(categoryId);
  }

  async deleteCategory(categoryId: string) {
    await this.db.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
    return { status: 'deleted', categoryId };
  }

  // Provider Categories
  async getProviderCategories(providerId: string) {
    const categories = await this.db.query(
      `SELECT c.* FROM categories c
       INNER JOIN provider_categories pc ON pc.category_id = c.id
       WHERE pc.provider_id = $1
       ORDER BY c.display_order, c.name`,
      [providerId]
    );
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      displayOrder: c.display_order,
      enabled: c.enabled,
    }));
  }

  async updateProviderCategories(providerId: string, categoryIds: string[]) {
    // Delete existing associations
    await this.db.query(
      `DELETE FROM provider_categories WHERE provider_id = $1`,
      [providerId]
    );

    // Insert new associations
    if (categoryIds.length > 0) {
      const values = categoryIds.map((_, idx) => `($1, $${idx + 2})`).join(', ');
      await this.db.query(
        `INSERT INTO provider_categories (provider_id, category_id) VALUES ${values}`,
        [providerId, ...categoryIds]
      );
    }

    return this.getProviderCategories(providerId);
  }

  // =====================================================
  // UCP TOOLS MANAGEMENT (GLOBAL)
  // =====================================================

  async getUcpTools() {
    const tools = await this.db.query(
      `SELECT * FROM ucp_tools ORDER BY category, display_name`
    );
    return tools.map(t => ({
      id: t.id,
      displayName: t.display_name,
      description: t.description,
      category: t.category,
      enabled: t.enabled,
      requestSchema: t.request_schema,
      responseSchema: t.response_schema,
      defaultTimeoutMs: t.default_timeout_ms,
      defaultRetryCount: t.default_retry_count,
      defaultRetryBackoffMs: t.default_retry_backoff_ms,
      authConfig: t.auth_config,
      version: t.version,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  async getUcpTool(toolId: string) {
    const tool = await this.db.queryOne(
      `SELECT * FROM ucp_tools WHERE id = $1`,
      [toolId]
    );
    if (!tool) return null;
    return {
      id: tool.id,
      displayName: tool.display_name,
      description: tool.description,
      category: tool.category,
      enabled: tool.enabled,
      requestSchema: tool.request_schema,
      responseSchema: tool.response_schema,
      defaultTimeoutMs: tool.default_timeout_ms,
      defaultRetryCount: tool.default_retry_count,
      defaultRetryBackoffMs: tool.default_retry_backoff_ms,
      authConfig: tool.auth_config,
      version: tool.version,
      createdAt: tool.created_at,
      updatedAt: tool.updated_at,
    };
  }

  async createUcpTool(data: {
    id: string;
    displayName: string;
    description?: string;
    category?: string;
    enabled?: boolean;
    requestSchema: object;
    responseSchema: object;
    defaultTimeoutMs?: number;
    defaultRetryCount?: number;
    defaultRetryBackoffMs?: number;
    authConfig?: object;
  }) {
    await this.db.query(
      `INSERT INTO ucp_tools (id, display_name, description, category, enabled, request_schema, response_schema, default_timeout_ms, default_retry_count, default_retry_backoff_ms, auth_config)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11::jsonb)`,
      [
        data.id,
        data.displayName,
        data.description || null,
        data.category || 'commerce',
        data.enabled !== false,
        JSON.stringify(data.requestSchema),
        JSON.stringify(data.responseSchema),
        data.defaultTimeoutMs || 30000,
        data.defaultRetryCount || 3,
        data.defaultRetryBackoffMs || 1000,
        JSON.stringify(data.authConfig || {}),
      ]
    );
    return this.getUcpTool(data.id);
  }

  async updateUcpTool(toolId: string, data: {
    displayName?: string;
    description?: string;
    category?: string;
    enabled?: boolean;
    requestSchema?: object;
    responseSchema?: object;
    defaultTimeoutMs?: number;
    defaultRetryCount?: number;
    defaultRetryBackoffMs?: number;
    authConfig?: object;
  }) {
    await this.db.query(
      `UPDATE ucp_tools SET
         display_name = COALESCE($2, display_name),
         description = COALESCE($3, description),
         category = COALESCE($4, category),
         enabled = COALESCE($5, enabled),
         request_schema = COALESCE($6::jsonb, request_schema),
         response_schema = COALESCE($7::jsonb, response_schema),
         default_timeout_ms = COALESCE($8, default_timeout_ms),
         default_retry_count = COALESCE($9, default_retry_count),
         default_retry_backoff_ms = COALESCE($10, default_retry_backoff_ms),
         auth_config = COALESCE($11::jsonb, auth_config),
         version = version + 1,
         updated_at = NOW()
       WHERE id = $1`,
      [
        toolId,
        data.displayName,
        data.description,
        data.category,
        data.enabled,
        data.requestSchema ? JSON.stringify(data.requestSchema) : null,
        data.responseSchema ? JSON.stringify(data.responseSchema) : null,
        data.defaultTimeoutMs,
        data.defaultRetryCount,
        data.defaultRetryBackoffMs,
        data.authConfig ? JSON.stringify(data.authConfig) : null,
      ]
    );
    return this.getUcpTool(toolId);
  }

  async deleteUcpTool(toolId: string) {
    await this.db.query(`DELETE FROM ucp_tools WHERE id = $1`, [toolId]);
    return { status: 'deleted', toolId };
  }

  async getUcpToolReadableSchema(toolId: string, schemaType: 'request' | 'response') {
    const tool = await this.getUcpTool(toolId);
    if (!tool) return null;

    const schema = schemaType === 'request' ? tool.requestSchema : tool.responseSchema;
    return this.convertSchemaToReadable(schema);
  }

  private convertSchemaToReadable(schema: any, parentPath: string = ''): any[] {
    const properties: any[] = [];

    if (!schema || typeof schema !== 'object') return properties;

    const required = schema.required || [];
    const props = schema.properties || {};

    for (const [name, prop] of Object.entries(props) as [string, any][]) {
      const fullPath = parentPath ? `${parentPath}.${name}` : name;
      const property: any = {
        name: fullPath,
        displayName: name,
        type: prop.type || 'any',
        required: required.includes(name),
        description: prop.description || '',
      };

      if (prop.enum) {
        property.enumValues = prop.enum;
      }
      if (prop.default !== undefined) {
        property.defaultValue = prop.default;
      }
      if (prop.minimum !== undefined) {
        property.minimum = prop.minimum;
      }
      if (prop.maximum !== undefined) {
        property.maximum = prop.maximum;
      }

      properties.push(property);

      // Handle nested objects
      if (prop.type === 'object' && prop.properties) {
        const nested = this.convertSchemaToReadable(prop, fullPath);
        properties.push(...nested);
      }

      // Handle arrays with object items
      if (prop.type === 'array' && prop.items?.type === 'object' && prop.items?.properties) {
        property.itemType = 'object';
        const nested = this.convertSchemaToReadable(prop.items, `${fullPath}[]`);
        properties.push(...nested);
      }
    }

    return properties;
  }

  // Tool Endpoint Testing
  async testToolEndpoint(providerId: string, toolName: string, payload: any) {
    const startTime = Date.now();

    try {
      // Execute the tool through the orchestrator with the specific provider
      const responseData = await this.orchestratorService.testTool(toolName, {
        ...payload,
        providerId,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        statusCode: 200,
        response: responseData,
        validationResult: {
          requestValid: true,
          responseValid: true,
          errors: [],
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        responseTime,
        statusCode: error?.response?.status ?? 500,
        error: error?.response?.data?.message || error?.message || String(error),
        validationResult: {
          requestValid: true,
          responseValid: false,
          errors: [error?.message || String(error)],
        },
      };
    }
  }
}
