import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  UserContext,
  UserPreferences,
  RecentSearch,
  ConversationState,
  Intent,
} from '../../common/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserContextService {
  private readonly CONTEXT_TTL = 7200; // 2 hours
  private readonly MAX_RECENT_SEARCHES = 10;
  private readonly MAX_RECENTLY_VIEWED = 20;

  constructor(
    private db: DatabaseService,
    private redis: RedisService,
  ) {}

  /**
   * Get or create user context for a session
   */
  async getOrCreateContext(userId: string, sessionId: string): Promise<UserContext> {
    // Try cache first
    const cached = await this.getContextFromCache(sessionId);
    if (cached) {
      return cached;
    }

    // Try database
    const fromDb = await this.getContextFromDb(sessionId);
    if (fromDb) {
      await this.cacheContext(fromDb);
      return fromDb;
    }

    // Create new context
    const newContext = this.createEmptyContext(userId, sessionId);
    await this.saveContext(newContext);
    return newContext;
  }

  /**
   * Update user context with new information
   */
  async updateContext(
    sessionId: string,
    updates: Partial<UserContext>,
  ): Promise<UserContext> {
    const context = await this.getContextFromCache(sessionId);
    if (!context) {
      throw new Error(`Context not found for session ${sessionId}`);
    }

    const updatedContext: UserContext = {
      ...context,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveContext(updatedContext);
    return updatedContext;
  }

  /**
   * Add a search to recent searches
   */
  async addRecentSearch(
    sessionId: string,
    query: string,
    categoryId?: string,
    resultCount: number = 0,
  ): Promise<void> {
    const context = await this.getContextFromCache(sessionId);
    if (!context) return;

    const recentSearch: RecentSearch = {
      query,
      categoryId,
      timestamp: new Date().toISOString(),
      resultCount,
    };

    const recentSearches = [recentSearch, ...context.recentSearches]
      .slice(0, this.MAX_RECENT_SEARCHES);

    await this.updateContext(sessionId, { recentSearches });
  }

  /**
   * Add a product to recently viewed
   */
  async addRecentlyViewed(sessionId: string, productId: string): Promise<void> {
    const context = await this.getContextFromCache(sessionId);
    if (!context) return;

    const recentlyViewed = [
      productId,
      ...context.recentlyViewed.filter(id => id !== productId),
    ].slice(0, this.MAX_RECENTLY_VIEWED);

    await this.updateContext(sessionId, { recentlyViewed });
  }

  /**
   * Update conversation state
   */
  async setConversationState(
    sessionId: string,
    state: ConversationState,
    lastIntent?: Intent,
  ): Promise<void> {
    const updates: Partial<UserContext> = {
      conversationState: state,
    };
    if (lastIntent) {
      updates.lastIntent = lastIntent;
    }
    await this.updateContext(sessionId, updates);
  }

  /**
   * Update user preferences based on behavior
   */
  async updatePreferencesFromBehavior(
    sessionId: string,
    category?: string,
    brand?: string,
    priceRange?: { min?: number; max?: number },
  ): Promise<void> {
    const context = await this.getContextFromCache(sessionId);
    if (!context) return;

    const preferences: UserPreferences = { ...context.preferences };

    if (category) {
      preferences.preferredCategories = this.updatePreferenceList(
        preferences.preferredCategories || [],
        category,
        5,
      );
    }

    if (brand) {
      preferences.preferredBrands = this.updatePreferenceList(
        preferences.preferredBrands || [],
        brand,
        5,
      );
    }

    if (priceRange) {
      preferences.priceRange = priceRange;
    }

    await this.updateContext(sessionId, { preferences });
  }

  /**
   * Get context summary for LLM system prompt
   */
  async getContextSummaryForPrompt(sessionId: string): Promise<string> {
    const context = await this.getContextFromCache(sessionId);
    if (!context) return '';

    const parts: string[] = [];

    if (context.recentSearches.length > 0) {
      const searches = context.recentSearches
        .slice(0, 3)
        .map(s => s.query)
        .join(', ');
      parts.push(`Recent searches: ${searches}`);
    }

    if (context.preferences.preferredCategories?.length) {
      parts.push(`Preferred categories: ${context.preferences.preferredCategories.join(', ')}`);
    }

    if (context.preferences.preferredBrands?.length) {
      parts.push(`Preferred brands: ${context.preferences.preferredBrands.join(', ')}`);
    }

    if (context.cartSummary && context.cartSummary.itemCount > 0) {
      parts.push(`Cart: ${context.cartSummary.itemCount} items, ${context.cartSummary.currency} ${context.cartSummary.totalAmount}`);
    }

    if (context.conversationState !== ConversationState.IDLE) {
      parts.push(`Current state: ${context.conversationState}`);
    }

    return parts.length > 0
      ? `\n\nUser Context:\n${parts.join('\n')}`
      : '';
  }

  /**
   * Persist context to database for long-term storage
   */
  async persistContextToDb(sessionId: string): Promise<void> {
    const context = await this.getContextFromCache(sessionId);
    if (!context) return;

    await this.db.query(
      `INSERT INTO user_contexts
       (id, user_id, session_id, preferences, recent_searches, recently_viewed,
        cart_summary, last_intent, conversation_state, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (session_id)
       DO UPDATE SET
         preferences = $4,
         recent_searches = $5,
         recently_viewed = $6,
         cart_summary = $7,
         last_intent = $8,
         conversation_state = $9,
         updated_at = $11`,
      [
        uuidv4(),
        context.userId,
        context.sessionId,
        JSON.stringify(context.preferences),
        JSON.stringify(context.recentSearches),
        JSON.stringify(context.recentlyViewed),
        context.cartSummary ? JSON.stringify(context.cartSummary) : null,
        context.lastIntent || null,
        context.conversationState,
        context.createdAt,
        context.updatedAt,
      ],
    );
  }

  // Private methods

  private async getContextFromCache(sessionId: string): Promise<UserContext | null> {
    const key = `user:context:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async getContextFromDb(sessionId: string): Promise<UserContext | null> {
    try {
      const row = await this.db.queryOne<any>(
        `SELECT * FROM user_contexts WHERE session_id = $1`,
        [sessionId],
      );

      if (!row) return null;

      return {
        userId: row.user_id,
        sessionId: row.session_id,
        preferences: row.preferences || {},
        recentSearches: row.recent_searches || [],
        recentlyViewed: row.recently_viewed || [],
        cartSummary: row.cart_summary,
        lastIntent: row.last_intent,
        conversationState: row.conversation_state || ConversationState.IDLE,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch {
      return null;
    }
  }

  private async cacheContext(context: UserContext): Promise<void> {
    const key = `user:context:${context.sessionId}`;
    await this.redis.set(key, JSON.stringify(context), this.CONTEXT_TTL);
  }

  private async saveContext(context: UserContext): Promise<void> {
    await this.cacheContext(context);
    // Async persist to DB (fire and forget for performance)
    this.persistContextToDb(context.sessionId).catch(err =>
      console.error('Failed to persist context to DB:', err),
    );
  }

  private createEmptyContext(userId: string, sessionId: string): UserContext {
    const now = new Date().toISOString();
    return {
      userId,
      sessionId,
      preferences: {
        language: 'en',
        currency: 'INR',
      },
      recentSearches: [],
      recentlyViewed: [],
      conversationState: ConversationState.IDLE,
      createdAt: now,
      updatedAt: now,
    };
  }

  private updatePreferenceList(
    existing: string[],
    newItem: string,
    maxItems: number,
  ): string[] {
    const filtered = existing.filter(item => item !== newItem);
    return [newItem, ...filtered].slice(0, maxItems);
  }
}
