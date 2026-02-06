import { Injectable } from '@nestjs/common';
import {
  BaseAgent,
  AgentCapability,
  AgentTask,
} from './base.agent';
import { StreamChunk } from '../llm/provider.interface';
import { Intent, ProductSummary, SearchFilters } from '../../common/types';
import { MCPClient } from '../tools/mcp.client';
import { SharedContextService } from './shared-context.service';
import { DatabaseService } from '../../common/database/database.service';
import { LLMExtractionService } from '../llm/llm-extraction.service';

/**
 * Product Browsing Agent - Handles product search and discovery
 *
 * Responsibilities:
 * - Multi-provider product search (PARALLEL execution)
 * - Product discovery and recommendations
 * - Search result deduplication and ranking
 * - Product comparison coordination
 *
 * KEY PERFORMANCE WIN: Parallel multi-provider searches (4x faster)
 */
@Injectable()
export class ProductBrowsingAgent extends BaseAgent {
  readonly name = 'ProductBrowsingAgent';
  readonly capabilities = [
    AgentCapability.SEARCH,
    AgentCapability.COMPARE,
  ];
  readonly priority = 80; // High priority for search/compare

  protected readonly allowedDelegations = ['ReasoningAgent'];

  // Flag to use LLM-based filter extraction
  private useLLMExtraction: boolean = true;

  constructor(
    private mcpClient: MCPClient,
    private sharedContext: SharedContextService,
    private db: DatabaseService,
    private llmExtraction: LLMExtractionService,
  ) {
    super();
  }

  /**
   * Can handle product search and comparison intents
   */
  canHandle(task: AgentTask): boolean {
    return (
      task.intent === Intent.PRODUCT_SEARCH ||
      task.intent === Intent.PRODUCT_COMPARE ||
      task.type === 'PRODUCT_SEARCH' ||
      task.type === 'PRODUCT_COMPARE'
    );
  }

  /**
   * Execute product search or comparison
   */
  async *execute(task: AgentTask): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    try {
      this.log('info', `Executing ${task.type}`, { taskId: task.id });

      // Update agent state
      await this.sharedContext.updateAgentState(task.context.sessionId, this.name, {
        agentName: this.name,
        currentTask: task,
        status: 'working',
        startedAt: new Date().toISOString(),
        workingMemory: {},
      });

      // Route to specific handler
      if (task.intent === Intent.PRODUCT_SEARCH) {
        yield* this.executeProductSearch(task);
      } else if (task.intent === Intent.PRODUCT_COMPARE) {
        yield* this.executeProductComparison(task);
      } else {
        throw new Error(`Unsupported intent: ${task.intent}`);
      }

      // Update state
      await this.sharedContext.updateAgentState(task.context.sessionId, this.name, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      this.log('info', `Task completed`, { taskId: task.id, duration });

    } catch (error) {
      this.log('error', `Task failed: ${error.message}`, {
        taskId: task.id,
        error: error.stack,
      });

      await this.sharedContext.updateAgentState(task.context.sessionId, this.name, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });

      yield {
        type: 'error',
        error: `Product Browsing Agent error: ${error.message}`,
      };
    }
  }

  /**
   * Execute multi-provider product search IN PARALLEL
   * This is the key performance optimization of multi-agent architecture
   */
  private async *executeProductSearch(task: AgentTask): AsyncGenerator<StreamChunk> {
    let { query, filters, sortBy, pagination } = task.parameters;

    // Use LLM to extract filters from natural language if enabled
    if (this.useLLMExtraction && task.parameters.message) {
      try {
        const extracted = await this.llmExtraction.extractSearchFilters(
          task.parameters.message || query
        );
        
        this.log('info', 'LLM extracted search filters', extracted);

        // Use LLM-extracted values, fallback to original if not extracted
        query = extracted.query || query;
        
        // Build filters from LLM extraction
        filters = {
          ...filters,
          ...(extracted.budget?.min && { priceMin: extracted.budget.min }),
          ...(extracted.budget?.max && { priceMax: extracted.budget.max }),
          ...(extracted.brands?.length && { brands: extracted.brands }),
          ...(extracted.inStock !== undefined && { inStock: extracted.inStock }),
        };
        
        // Add category to query if extracted
        if (extracted.category && !query.toLowerCase().includes(extracted.category.toLowerCase())) {
          query = `${extracted.category} ${query}`;
        }
        
        // Add attributes to filters
        if (extracted.attributes && Object.keys(extracted.attributes).length > 0) {
          filters = {
            ...filters,
            attributes: extracted.attributes,
          };
        }
        
        sortBy = extracted.sortBy || sortBy;
      } catch (error) {
        this.log('warn', `LLM filter extraction failed: ${error.message}`);
        // Continue with original parameters
      }
    }

    this.log('info', 'Starting parallel multi-provider search', {
      query,
      filters,
    });

    // Get enabled providers from database
    const providers = await this.getEnabledProviders();

    if (providers.length === 0) {
      yield {
        type: 'token',
        content: 'No providers available for search',
      };
      yield { type: 'done' };
      return;
    }

    this.log('info', `Searching across ${providers.length} providers in parallel`);

    // Create search promises for each provider (PARALLEL EXECUTION)
    // Use provider.id (e.g., "mock") not provider.name (e.g., "Mock Provider")
    const searchPromises = providers.map(provider =>
      this.searchProvider(provider.id, {
        query,
        filters,
        sortBy,
        pagination: pagination || { page: 1, limit: 20 },
      })
    );

    // Execute all searches simultaneously
    const searchStartTime = Date.now();
    const results = await Promise.allSettled(searchPromises);
    const searchDuration = Date.now() - searchStartTime;

    this.log('info', `Parallel search completed`, {
      duration: searchDuration,
      providers: providers.length,
      speedup: `~${providers.length}x faster than sequential`,
    });

    // Extract successful results
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    // Log failures
    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    if (failures.length > 0) {
      this.log('warn', `${failures.length} provider(s) failed`, {
        errors: failures.map(f => f.reason?.message),
      });
    }

    // Aggregate and deduplicate results
    const aggregatedProducts = this.aggregateSearchResults(successfulResults);

    // Deduplicate by product name/brand similarity
    const deduplicatedProducts = this.deduplicateProducts(aggregatedProducts);

    // Rank by relevance
    const rankedProducts = this.rankByRelevance(deduplicatedProducts, query);

    this.log('info', `Search results processed`, {
      total: aggregatedProducts.length,
      afterDedup: deduplicatedProducts.length,
      finalResults: rankedProducts.length,
    });

    // Format and stream response
    yield* this.formatSearchResults(rankedProducts, query, filters);
  }

  /**
   * Search a single provider
   */
  private async searchProvider(
    providerName: string,
    params: {
      query: string;
      filters?: SearchFilters;
      sortBy?: string;
      pagination?: { page: number; limit: number };
    },
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await this.mcpClient.executeTool(
        'commerce.searchProducts',
        {
          query: params.query,
          filters: params.filters,
          sortBy: params.sortBy || 'relevance',
          pagination: params.pagination,
          provider: providerName,
        },
      );

      const duration = Date.now() - startTime;
      this.log('debug', `Provider ${providerName} search completed`, {
        duration,
        resultCount: result.data?.products?.length || 0,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Provider ${providerName} search failed`, {
        duration,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get enabled providers from database
   */
  private async getEnabledProviders(): Promise<Array<{ name: string; id: string }>> {
    try {
      const result = await this.db.query<any>(
        `SELECT id, name, enabled, capabilities
         FROM providers
         WHERE enabled = true
           AND ('SEARCH' = ANY(capabilities) OR 'search' = ANY(capabilities))
         ORDER BY name`
      );

      return result.map(row => ({
        id: row.id,
        name: row.name,
      }));
    } catch (error) {
      this.log('error', 'Failed to fetch providers', { error: error.message });
      return [];
    }
  }

  /**
   * Aggregate search results from multiple providers
   */
  private aggregateSearchResults(results: any[]): ProductSummary[] {
    const products: ProductSummary[] = [];

    for (const result of results) {
      if (result.ok && result.data?.products) {
        products.push(...result.data.products);
      }
    }

    return products;
  }

  /**
   * Deduplicate products by name/brand similarity
   * Uses simple string matching - in production, use fuzzy matching
   */
  private deduplicateProducts(products: ProductSummary[]): ProductSummary[] {
    const seen = new Map<string, ProductSummary>();

    for (const product of products) {
      // Create dedup key from name + brand
      const key = this.createDedupKey(product);

      // Keep product with better rating or lower price if duplicate
      if (!seen.has(key)) {
        seen.set(key, product);
      } else {
        const existing = seen.get(key)!;
        // Prefer product with higher rating
        if ((product.rating || 0) > (existing.rating || 0)) {
          seen.set(key, product);
        }
        // Or lower price if ratings are equal
        else if (
          product.rating === existing.rating &&
          product.price.amount < existing.price.amount
        ) {
          seen.set(key, product);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Create deduplication key from product
   */
  private createDedupKey(product: ProductSummary): string {
    const name = product.name.toLowerCase().trim();
    const brand = (product.brand || '').toLowerCase().trim();
    // Remove common words and normalize
    const normalized = name
      .replace(/\b(the|and|or|with|for)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${brand}:${normalized}`;
  }

  /**
   * Rank products by relevance to query
   * Simple scoring - in production, use TF-IDF or semantic similarity
   */
  private rankByRelevance(products: ProductSummary[], query: string): ProductSummary[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    // Calculate relevance score
    const scored = products.map(product => {
      let score = 0;

      // Exact match in name: +10
      if (product.name.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Each query term in name: +3
      for (const term of queryTerms) {
        if (product.name.toLowerCase().includes(term)) {
          score += 3;
        }
      }

      // Brand match: +5
      if (product.brand && queryLower.includes(product.brand.toLowerCase())) {
        score += 5;
      }

      // Rating boost: +rating (0-5)
      if (product.rating) {
        score += product.rating;
      }

      // In stock boost: +2
      if (product.availability.inStock) {
        score += 2;
      }

      return { product, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.product);
  }

  /**
   * Format search results for display
   */
  private async *formatSearchResults(
    products: ProductSummary[],
    query: string,
    filters?: SearchFilters,
  ): AsyncGenerator<StreamChunk> {
    const limitedProducts = products.slice(0, 5); // Limit to top 5
    
    // Format a user-friendly text message
    let message = '';
    if (products.length === 0) {
      message = `I couldn't find any products matching "${query}". Try adjusting your search criteria or browse our categories.`;
    } else {
      message = `I found ${products.length} product${products.length > 1 ? 's' : ''} matching "${query}"`;
      
      // Add filter context
      if (filters?.priceMax) {
        message += ` under ₹${filters.priceMax.toLocaleString('en-IN')}`;
      }
      if (filters?.priceMin) {
        message += ` above ₹${filters.priceMin.toLocaleString('en-IN')}`;
      }
      if (filters?.brands?.length) {
        message += ` from ${filters.brands.join(', ')}`;
      }
      
      message += `. Here are the top results:`;
    }

    // Emit the text message first
    yield {
      type: 'token',
      content: message,
    };

    // Emit the products as 'cards' for proper UI rendering
    if (limitedProducts.length > 0) {
      yield {
        type: 'cards',
        products: limitedProducts,
      };
    }

    yield {
      type: 'done',
    };
  }

  /**
   * Execute product comparison
   */
  private async *executeProductComparison(task: AgentTask): AsyncGenerator<StreamChunk> {
    const { productIds } = task.parameters;

    this.log('info', 'Starting product comparison', {
      productIds,
    });

    if (!productIds || productIds.length < 2) {
      yield {
        type: 'error',
        error: 'At least 2 products are required for comparison',
      };
      return;
    }

    try {
      // Call comparison tool
      const result = await this.mcpClient.executeTool('commerce.compareProducts', {
        productIds,
      });

      if (result.ok && result.data) {
        yield {
          type: 'token',
          content: JSON.stringify(result.data, null, 2),
        };
      } else {
        throw new Error(result.error?.message || 'Comparison failed');
      }

      yield { type: 'done' };
    } catch (error) {
      this.log('error', 'Comparison failed', { error: error.message });
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }
}
