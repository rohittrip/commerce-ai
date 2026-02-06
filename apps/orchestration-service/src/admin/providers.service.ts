import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

@Injectable()
export class ProvidersService {
  constructor(private db: DatabaseService) {}

  /**
   * Helper to flatten nested field mappings for UI
   */
  private flattenFieldMappings(mappings: any): Record<string, string> {
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
  }

  /**
   * Helper to unflatten field mappings from UI format to DB nested format
   */
  private unflattenFieldMappings(flat: Record<string, string>): any {
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
  }

  /**
   * Transform provider data from DB to frontend format
   */
  private transformProvider(p: any) {
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
        fieldMappings: this.flattenFieldMappings(p.field_mappings)
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

  /**
   * Get all providers with optional filtering
   */
  async getProviders(filters?: { enabled?: boolean }) {
    const whereClause = filters?.enabled !== undefined
      ? 'WHERE enabled = $1'
      : '';
    const params = filters?.enabled !== undefined ? [filters.enabled] : [];

    const providers = await this.db.query(
      `SELECT * FROM providers ${whereClause} ORDER BY name`,
      params
    );

    return providers.map(p => this.transformProvider(p));
  }

  /**
   * Get a specific provider by ID
   */
  async getProvider(providerId: string) {
    const p = await this.db.queryOne(
      `SELECT * FROM providers WHERE id = $1`,
      [providerId]
    );

    if (!p) return null;

    return this.transformProvider(p);
  }

  /**
   * Create a new provider
   */
  async createProvider(providerData: any) {
    const id = providerData.id || providerData.providerId;

    // Convert capabilities from frontend format to DB format
    const capabilitiesArray = providerData.capabilities
      ? providerData.capabilities
          .filter((cap: any) => cap.enabled)
          .map((cap: any) => cap.name.toLowerCase())
      : [];

    await this.db.query(
      `INSERT INTO providers (id, name, type, base_url, api_key, enabled, config, capabilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::text[])`,
      [
        id,
        providerData.name || providerData.providerName,
        providerData.type || 'ecommerce',
        providerData.base_url || providerData.credentials?.endpoint,
        providerData.api_key || providerData.credentials?.apiKey,
        providerData.enabled !== false,
        JSON.stringify(providerData.config || {}),
        capabilitiesArray
      ]
    );

    return this.getProvider(id);
  }

  /**
   * Update provider configuration
   */
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

  /**
   * Update provider field and category mappings
   */
  async updateProviderMappings(providerId: string, mappings: any) {
    const fieldMappings = this.unflattenFieldMappings(mappings.fieldMappings || {});
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

  /**
   * Delete a provider
   */
  async deleteProvider(providerId: string) {
    await this.db.query(
      'DELETE FROM providers WHERE id = $1',
      [providerId]
    );

    return { status: 'deleted' };
  }

  /**
   * Get provider statistics
   */
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
      lastCallAt: stats?.last_call_at || null
    };
  }

  /**
   * Update tool configuration for a specific provider
   */
  async updateToolConfig(providerId: string, toolName: string, config: any) {
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
}
