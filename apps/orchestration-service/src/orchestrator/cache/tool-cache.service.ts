import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { DatabaseService } from '../../common/database/database.service';
import {
  ToolCacheConfig,
  DEFAULT_TOOL_CACHE_CONFIG,
  ToolResponse,
} from '../../common/types';
import * as crypto from 'crypto';

@Injectable()
export class ToolCacheService {
  private cacheConfigs: Record<string, ToolCacheConfig> = { ...DEFAULT_TOOL_CACHE_CONFIG };

  constructor(
    private redis: RedisService,
    private db: DatabaseService,
  ) {}

  async onModuleInit() {
    await this.loadCacheConfigFromDb();
  }

  /**
   * Load cache configuration from database (admin_configs)
   */
  private async loadCacheConfigFromDb(): Promise<void> {
    try {
      const config = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'tools.cache_config'"
      );
      if (config?.value) {
        this.cacheConfigs = { ...DEFAULT_TOOL_CACHE_CONFIG, ...config.value };
      }
    } catch (error) {
      console.warn('Failed to load cache config from DB, using defaults');
    }
  }

  /**
   * Get cached result for a tool call
   */
  async getCachedResult<T>(
    toolName: string,
    request: any,
  ): Promise<ToolResponse<T> | null> {
    const config = this.getCacheConfig(toolName);
    if (!config.enabled) {
      return null;
    }

    const cacheKey = this.generateCacheKey(toolName, request, config);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      console.log(`[ToolCache] Cache HIT for ${toolName}`);
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        _cached: true,
        _cachedAt: parsed._cachedAt,
      };
    }

    console.log(`[ToolCache] Cache MISS for ${toolName}`);
    return null;
  }

  /**
   * Cache a tool response
   */
  async cacheResult<T>(
    toolName: string,
    request: any,
    response: ToolResponse<T>,
  ): Promise<void> {
    const config = this.getCacheConfig(toolName);
    if (!config.enabled || !response.ok) {
      return; // Don't cache disabled tools or error responses
    }

    const cacheKey = this.generateCacheKey(toolName, request, config);
    const toCache = {
      ...response,
      _cachedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, JSON.stringify(toCache), config.ttlSeconds);
    console.log(`[ToolCache] Cached ${toolName} for ${config.ttlSeconds}s`);
  }

  /**
   * Invalidate cache for a specific tool and request
   */
  async invalidateCache(toolName: string, request?: any): Promise<void> {
    const config = this.getCacheConfig(toolName);
    if (!config.enabled) return;

    if (request) {
      const cacheKey = this.generateCacheKey(toolName, request, config);
      await this.redis.del(cacheKey);
      console.log(`[ToolCache] Invalidated cache for ${toolName}`);
    }
    // For full tool invalidation, would need pattern-based deletion
    // which requires SCAN command - skipping for now
  }

  /**
   * Invalidate user-specific caches (e.g., after cart update)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    // Invalidate cart-related caches for user
    const cartCacheKey = `tool:cart:${userId}`;
    await this.redis.del(cartCacheKey);
  }

  /**
   * Get cache configuration for a tool
   */
  getCacheConfig(toolName: string): ToolCacheConfig {
    return this.cacheConfigs[toolName] || {
      enabled: false,
      ttlSeconds: 0,
      cacheKeyPrefix: '',
    };
  }

  /**
   * Update cache configuration dynamically
   */
  updateCacheConfig(toolName: string, config: Partial<ToolCacheConfig>): void {
    if (this.cacheConfigs[toolName]) {
      this.cacheConfigs[toolName] = {
        ...this.cacheConfigs[toolName],
        ...config,
      };
    }
  }

  /**
   * Check if result should be served from cache
   * considering freshness requirements
   */
  shouldUseCache(
    toolName: string,
    requestHeaders?: Record<string, string>,
  ): boolean {
    const config = this.getCacheConfig(toolName);
    if (!config.enabled) return false;

    // Check for no-cache header
    if (requestHeaders?.['x-cache-control'] === 'no-cache') {
      return false;
    }

    return true;
  }

  /**
   * Generate cache key from tool name and request
   */
  private generateCacheKey(
    toolName: string,
    request: any,
    config: ToolCacheConfig,
  ): string {
    // Remove volatile fields from request for consistent caching
    const cacheableRequest = this.extractCacheableFields(toolName, request);
    const requestHash = this.hashObject(cacheableRequest);
    return `${config.cacheKeyPrefix}:${requestHash}`;
  }

  /**
   * Extract only cacheable fields from request
   * (exclude userId for shared caches, include for personalized)
   */
  private extractCacheableFields(toolName: string, request: any): any {
    // Clone request
    const cacheable = { ...request };

    // Remove non-cacheable fields
    delete cacheable.userId; // User-specific queries shouldn't use shared cache
    delete cacheable.idempotencyKey;
    delete cacheable.traceId;

    // For search, include query parameters but not session-specific data
    if (toolName.includes('search')) {
      return {
        query: cacheable.query,
        filters: cacheable.filters,
        sortBy: cacheable.sortBy,
        pagination: cacheable.pagination,
      };
    }

    // For product details, cache by productId + provider
    if (toolName.includes('getProductById')) {
      return {
        productId: cacheable.productId,
        provider: cacheable.provider,
        includeVariants: cacheable.includeVariants,
        includeReviews: cacheable.includeReviews,
      };
    }

    // For compare, cache by product IDs (sorted for consistency)
    if (toolName.includes('compare')) {
      return {
        productIds: [...(cacheable.productIds || [])].sort(),
      };
    }

    // For catalog/providers, cache by category
    if (toolName.includes('Catalog') || toolName.includes('Providers')) {
      return {
        category: cacheable.category,
        depth: cacheable.depth,
        capabilities: cacheable.capabilities,
      };
    }

    return cacheable;
  }

  /**
   * Create a hash of an object for cache key
   */
  private hashObject(obj: any): string {
    const normalized = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCached: number;
    byTool: Record<string, number>;
  }> {
    // This would require Redis SCAN to count keys
    // Returning placeholder for now
    return {
      totalCached: 0,
      byTool: {},
    };
  }
}
