import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { Intent, UserContext } from '../../common/types';

interface SystemPromptConfig {
  basePrompt: string;
  contextTemplate: string;
  intentPrompts: Record<string, string>;
  clarificationPrompts: Record<string, string>;
  toolInstructions: Record<string, string>;
}

@Injectable()
export class PromptService implements OnModuleInit {
  private config: SystemPromptConfig;

  constructor(private db: DatabaseService) {
    this.config = this.getDefaultConfig();
  }

  async onModuleInit() {
    await this.loadConfigFromDb();
  }

  private async loadConfigFromDb(): Promise<void> {
    try {
      const result = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'llm.system_prompt'"
      );
      if (result?.value) {
        this.config = { ...this.config, ...result.value };
      }
    } catch {
      console.warn('Failed to load prompt config from DB, using defaults');
    }
  }

  /**
   * Build complete system prompt with user context
   */
  buildSystemPrompt(userContext?: UserContext): string {
    let prompt = this.config.basePrompt;

    if (userContext) {
      prompt += this.buildContextSection(userContext);
    }

    prompt += this.buildToolInstructions();
    prompt += this.buildResponseGuidelines();

    return prompt;
  }

  /**
   * Build intent-specific prompt enhancement
   */
  buildIntentPrompt(intent: Intent): string {
    return this.config.intentPrompts[intent] || '';
  }

  /**
   * Build clarification prompt for ambiguous queries
   */
  buildClarificationPrompt(intent: Intent, options?: string[]): string {
    const basePrompt = this.config.clarificationPrompts[intent] ||
      'I\'d like to help you better. Could you please provide more details?';

    if (options && options.length > 0) {
      return `${basePrompt}\n\nHere are some options:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
    }

    return basePrompt;
  }

  /**
   * Get tool-specific instructions for the LLM
   */
  getToolInstructions(toolName: string): string {
    return this.config.toolInstructions[toolName] || '';
  }

  private buildContextSection(context: UserContext): string {
    const parts: string[] = [];

    if (context.recentSearches.length > 0) {
      const searches = context.recentSearches
        .slice(0, 3)
        .map(s => s.query)
        .join(', ');
      parts.push(`The user recently searched for: ${searches}`);
    }

    if (context.preferences.preferredCategories?.length) {
      parts.push(`Preferred categories: ${context.preferences.preferredCategories.join(', ')}`);
    }

    if (context.preferences.preferredBrands?.length) {
      parts.push(`Preferred brands: ${context.preferences.preferredBrands.join(', ')}`);
    }

    if (context.cartSummary && context.cartSummary.itemCount > 0) {
      parts.push(`Cart has ${context.cartSummary.itemCount} items worth ${context.cartSummary.currency} ${context.cartSummary.totalAmount}`);
    }

    if (parts.length === 0) return '';

    return `\n\n## User Context\n${parts.join('\n')}`;
  }

  private buildToolInstructions(): string {
    return `

## Available Tools
You have access to the following tools for helping users:

### Product Discovery
- **commerce.searchProducts**: Search for products across all providers. Use filters for brand, category, price range.
- **commerce.getProductById**: Get detailed product information including specifications and variants.
- **commerce.compareProducts**: Compare 2-5 products side-by-side with feature matrix.
- **commerce.getCatalogByCategory**: Browse product categories and subcategories.
- **commerce.findProvidersByCategory**: Find available providers for a category.
- **commerce.getRecommendations**: Get personalized product recommendations.
- **commerce.getProductReviews**: Get reviews and ratings for a product.
- **commerce.checkAvailability**: Check product availability and delivery estimates.

### Shopping
- **commerce.cart.addItem**: Add product to cart (requires productId, provider, quantity).
- **commerce.cart.updateItemQty**: Update item quantity in cart.
- **commerce.cart.removeItem**: Remove item from cart.
- **commerce.cart.getCart**: Get current cart contents.

### Checkout & Orders
- **commerce.checkout.create**: Create checkout session from cart (freezes prices, 30-min validity).
- **commerce.checkout.update**: Update checkout with shipping address and payment method.
- **commerce.checkout.get**: Retrieve checkout session details.
- **commerce.checkout.complete**: Complete checkout and create order (requires confirmation for orders >₹50,000).
- **commerce.checkout.cancel**: Cancel checkout session.

### Product Discovery
- **commerce.product.estimateShipping**: Estimate shipping cost and delivery time.
- **commerce.product.listVariants**: Get product variants (size, color, etc).
- **commerce.promotions.get**: Get active promotions for a product.
- **commerce.promotions.validateCoupon**: Validate coupon code applicability.

## Tool Usage Guidelines
1. Always search before showing products - don't make assumptions about availability.
2. When comparing products, fetch full details first.
3. For add-to-cart, always include the provider from the product's source.
4. Use estimateShipping before confirming delivery timelines.
5. Follow the UCP checkout flow: create → update → complete (never use old order.createOrder).
6. For orders >₹50,000, pause and wait for explicit user confirmation before completing checkout.`;
  }

  private buildResponseGuidelines(): string {
    return `

## Response Guidelines
1. Be concise and helpful - avoid long explanations unless asked.
2. Always show product prices in INR format (₹).
3. Highlight key product features: price, brand, rating, availability.
4. If a search returns no results, suggest alternatives or broader searches.
5. When products are out of stock, suggest similar in-stock alternatives.
6. For checkout, always confirm the total amount and delivery address.
7. If the query is unclear, ask a clarifying question with options.
8. Use bullet points for listing multiple items or features.
9. Provide follow-up suggestions after completing an action.`;
  }

  private getDefaultConfig(): SystemPromptConfig {
    return {
      basePrompt: `You are a helpful shopping assistant for an e-commerce platform. Your goal is to help users:
- Find products they're looking for
- Compare options to make informed decisions
- Manage their shopping cart
- Complete purchases smoothly

Be friendly, concise, and proactive in suggesting relevant actions.`,

      contextTemplate: `
User Context:
{context}`,

      intentPrompts: {
        [Intent.PRODUCT_SEARCH]: 'Focus on understanding what the user wants and use appropriate filters.',
        [Intent.PRODUCT_COMPARE]: 'Highlight key differences and provide a clear recommendation.',
        [Intent.ADD_TO_CART]: 'Confirm the product and quantity before adding.',
        [Intent.CHECKOUT]: 'Verify cart contents, address, and payment method before proceeding.',
        [Intent.ORDER_STATUS]: 'Provide clear tracking information and expected delivery dates.',
        [Intent.GENERAL_CHAT]: 'Be helpful and guide users toward shopping actions when appropriate.',
      },

      clarificationPrompts: {
        [Intent.PRODUCT_SEARCH]: 'I\'d love to help you find the perfect product. Could you tell me more about what you\'re looking for?',
        [Intent.PRODUCT_COMPARE]: 'Which products would you like to compare? You can share product names or IDs.',
        [Intent.ADD_TO_CART]: 'Which product would you like to add to your cart?',
        [Intent.ORDER_STATUS]: 'I can help track your order. Please provide your order ID or number.',
      },

      toolInstructions: {
        'commerce.searchProducts': 'Always include relevant filters from the user query. Limit results to 10-20 items unless asked for more.',
        'commerce.compareProducts': 'Compare at least 2 products. Focus on price, features, and ratings.',
        'commerce.cart.addItem': 'Always verify quantity and provider before adding.',
        'commerce.checkout.create': 'Create checkout session from cart to freeze prices.',
        'commerce.checkout.complete': 'Require explicit user confirmation. MUST prompt for confirmation if total >₹50,000.',
      },
    };
  }

  /**
   * Reload configuration from database
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfigFromDb();
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<SystemPromptConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.db.query(
      `INSERT INTO admin_configs (key, value, updated_at)
       VALUES ('llm.system_prompt', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify(this.config)],
    );
  }
}
