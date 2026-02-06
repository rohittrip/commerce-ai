import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

@Injectable()
export class ToolsService {
  constructor(private db: DatabaseService) {}

  /**
   * Get UCP tools with optional filtering
   */
  async getUcpTools(filters?: { toolType?: string; isInternal?: boolean; enabled?: boolean }) {
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.toolType) {
      whereConditions.push(`tool_type = $${paramIndex++}`);
      params.push(filters.toolType);
    }

    if (filters?.isInternal !== undefined) {
      whereConditions.push(`is_internal = $${paramIndex++}`);
      params.push(filters.isInternal);
    }

    if (filters?.enabled !== undefined) {
      whereConditions.push(`enabled = $${paramIndex++}`);
      params.push(filters.enabled);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    return await this.db.query(
      `SELECT * FROM ucp_tools ${whereClause}
       ORDER BY category, display_name`,
      params
    );
  }

  /**
   * Get internal tools (orchestration and thinking)
   */
  async getInternalTools() {
    return this.getUcpTools({ isInternal: true });
  }

  /**
   * Get provider tools (commerce APIs)
   */
  async getProviderTools() {
    return this.getUcpTools({ toolType: 'provider_api' });
  }

  /**
   * Get a specific UCP tool by ID
   */
  async getUcpTool(toolId: string) {
    return await this.db.queryOne(
      'SELECT * FROM ucp_tools WHERE id = $1',
      [toolId]
    );
  }

  /**
   * Update UCP tool configuration
   */
  async updateUcpTool(toolId: string, updates: any) {
    const allowedFields = [
      'display_name',
      'description',
      'category',
      'enabled',
      'request_schema',
      'response_schema',
      'default_timeout_ms',
      'default_retry_count'
    ];

    const setClause: string[] = [];
    const params: any[] = [toolId];
    let paramIndex = 2;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex++}`);
        params.push(updates[key]);
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = NOW()`);

    await this.db.query(
      `UPDATE ucp_tools SET ${setClause.join(', ')} WHERE id = $1`,
      params
    );

    return this.getUcpTool(toolId);
  }

  /**
   * Get tool call statistics
   */
  async getToolCallStats(filters?: { days?: number; isInternal?: boolean }) {
    const days = filters?.days || 7;
    const whereConditions = [`created_at > NOW() - INTERVAL '${days} days'`];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.isInternal !== undefined) {
      whereConditions.push(`is_internal = $${paramIndex++}`);
      params.push(filters.isInternal);
    }

    const whereClause = whereConditions.join(' AND ');

    return await this.db.query(
      `SELECT tool_name,
              is_internal,
              COUNT(*) as total_calls,
              COUNT(*) FILTER (WHERE success = true) as successful_calls,
              COUNT(*) FILTER (WHERE success = false) as failed_calls,
              AVG(duration_ms) as avg_duration_ms,
              MAX(created_at) as last_call_at
       FROM tool_calls
       WHERE ${whereClause}
       GROUP BY tool_name, is_internal
       ORDER BY total_calls DESC`,
      params
    );
  }
}
