import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  Intent,
  IntentFrame,
  UserContext,
  ClarificationPrompt,
  SearchFilters,
} from '../../common/types';

interface CategoryTaxonomy {
  id: string;
  name: string;
  keywords: string[];
  parentId?: string;
  children?: string[];
}

interface BrandInfo {
  name: string;
  aliases: string[];
  categories: string[];
}

@Injectable()
export class IntentService implements OnModuleInit {
  private taxonomy: Record<string, CategoryTaxonomy> = {};
  private brands: BrandInfo[] = [];
  private clarificationPrompts: Record<string, ClarificationPrompt[]> = {};

  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await Promise.all([
      this.loadTaxonomy(),
      this.loadBrands(),
      this.loadClarificationPrompts(),
    ]);
  }

  private async loadTaxonomy() {
    try {
      const config = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'taxonomy.categories'"
      );
      if (config?.value) {
        this.taxonomy = config.value;
      }
    } catch (error) {
      console.warn('Failed to load taxonomy from DB');
    }
  }

  private async loadBrands() {
    try {
      const config = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'taxonomy.brands'"
      );
      if (config?.value?.brands) {
        this.brands = config.value.brands;
      }
    } catch (error) {
      console.warn('Failed to load brands from DB');
    }
  }

  private async loadClarificationPrompts() {
    try {
      const config = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'prompts.clarification'"
      );
      if (config?.value) {
        this.clarificationPrompts = config.value;
      } else {
        this.clarificationPrompts = this.getDefaultClarificationPrompts();
      }
    } catch {
      this.clarificationPrompts = this.getDefaultClarificationPrompts();
    }
  }

  /**
   * Detect intent from user message with context awareness
   */
  async detectIntent(
    text: string,
    userContext?: UserContext,
  ): Promise<IntentFrame> {
    const lowerText = text.toLowerCase().trim();

    // Check for follow-up intents based on conversation state
    if (userContext?.conversationState) {
      const followUpIntent = this.detectFollowUpIntent(lowerText, userContext);
      if (followUpIntent) {
        return followUpIntent;
      }
    }

    // Product search intent
    if (this.isSearchIntent(lowerText)) {
      return this.buildSearchIntent(lowerText, text, userContext);
    }

    // Product comparison intent
    if (this.isCompareIntent(lowerText)) {
      return this.buildCompareIntent(lowerText, text, userContext);
    }

    // Add to cart intent
    if (this.isAddToCartIntent(lowerText)) {
      return this.buildAddToCartIntent(lowerText, text);
    }

    // Checkout intent
    if (this.isCheckoutIntent(lowerText)) {
      return this.buildCheckoutIntent(lowerText, text);
    }

    // Order status intent
    if (this.isOrderStatusIntent(lowerText)) {
      return this.buildOrderStatusIntent(lowerText, text);
    }

    // Availability check intent
    if (this.isAvailabilityIntent(lowerText)) {
      return this.buildAvailabilityIntent(lowerText, text);
    }

    // Cart view/update intent
    if (this.isCartIntent(lowerText)) {
      return this.buildCartIntent(lowerText, text);
    }

    // Recommendations intent
    if (this.isRecommendationIntent(lowerText)) {
      return this.buildRecommendationIntent(lowerText, text, userContext);
    }

    // General chat fallback
    return this.buildGeneralChatIntent(lowerText, text);
  }

  /**
   * Generate clarification question for ambiguous queries
   */
  generateClarificationQuestion(intent: Intent, context: string): ClarificationPrompt | null {
    const prompts = this.clarificationPrompts[intent] || [];
    if (prompts.length === 0) return null;

    // Find most relevant prompt based on context
    for (const prompt of prompts) {
      if (context.includes(prompt.context) || prompt.context === 'default') {
        return prompt;
      }
    }

    return prompts[0];
  }

  /**
   * Check if query needs clarification
   */
  needsClarification(frame: IntentFrame): boolean {
    return frame.needClarification || frame.confidence < 0.7;
  }

  /**
   * Get suggested follow-up actions based on intent
   */
  getSuggestedFollowUps(intent: Intent, hasResults: boolean): string[] {
    const suggestions: Record<Intent, string[]> = {
      [Intent.PRODUCT_SEARCH]: hasResults
        ? ['Compare these products', 'Filter by brand', 'Sort by price', 'Add to cart']
        : ['Try different keywords', 'Browse categories', 'Show trending products'],
      [Intent.PRODUCT_COMPARE]: [
        'Add to cart',
        'Check availability',
        'View reviews',
        'See more options',
      ],
      [Intent.ADD_TO_CART]: [
        'View cart',
        'Continue shopping',
        'Proceed to checkout',
      ],
      [Intent.CHECKOUT]: [
        'Track order',
        'Continue shopping',
        'View order details',
      ],
      [Intent.ORDER_STATUS]: [
        'Contact support',
        'View order details',
        'Return item',
      ],
      [Intent.GENERAL_CHAT]: [
        'Search for products',
        'View my cart',
        'Track an order',
      ],
      [Intent.UPDATE_CART_QTY]: ['View cart', 'Checkout'],
      [Intent.REMOVE_FROM_CART]: ['View cart', 'Continue shopping'],
      [Intent.CREATE_ORDER]: ['Track order'],
      [Intent.POLICY_QA]: ['Search products', 'Contact support'],
    };

    return suggestions[intent] || [];
  }

  // Intent detection methods

  private isSearchIntent(text: string): boolean {
    const patterns = [
      'show me', 'search', 'find', 'looking for', 'want', 'need',
      'browse', 'explore', 'display', 'list', 'get me', 'i need',
      'show', 'any', 'recommend', 'suggest', 'what about',
    ];
    
    // Check for explicit search patterns
    if (this.matchesAnyPattern(text, patterns)) {
      return true;
    }
    
    // Check for product category + price filter pattern (e.g., "mobile under 20k", "laptop below 50000")
    const hasPriceFilter = /(?:under|below|above|less than|more than|upto|up to|between|starting|from|max|min)\s*(?:rs\.?|inr|₹)?\s*\d+/i.test(text);
    const hasCategory = this.resolveCategory(text) !== undefined;
    
    if (hasPriceFilter && hasCategory) {
      return true;
    }
    
    // Check for product category mentions (even without explicit search keywords)
    // Common product categories that imply search
    const productCategories = [
      'mobile', 'phone', 'laptop', 'tv', 'television', 'camera', 'headphone',
      'earphone', 'speaker', 'watch', 'tablet', 'computer', 'ac', 'fridge',
      'refrigerator', 'washing machine', 'microwave', 'oven', 'fan', 'cooler',
      'shoe', 'shirt', 'jeans', 'dress', 'bag', 'wallet', 'perfume',
    ];
    
    const hasProductCategory = productCategories.some(cat => text.includes(cat));
    if (hasProductCategory && hasPriceFilter) {
      return true;
    }
    
    // Check for brand mention + price filter
    const hasBrand = this.extractBrands(text).length > 0;
    if (hasBrand && hasPriceFilter) {
      return true;
    }
    
    return false;
  }

  private isCompareIntent(text: string): boolean {
    const patterns = [
      'compare', 'difference between', 'vs', 'versus', 'which is better',
      'better option', 'comparison', 'side by side',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  private isAddToCartIntent(text: string): boolean {
    const patterns = [
      'add to cart', 'add to bag', 'add item', 'buy this', 'i want this',
      'add it', 'get this', 'purchase',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  private isCheckoutIntent(text: string): boolean {
    const patterns = [
      'checkout', 'check out', 'place order', 'order now', 'complete order',
      'buy now', 'proceed to payment', 'pay now',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  private isOrderStatusIntent(text: string): boolean {
    const patterns = [
      'order status', 'track order', 'where is my order', 'delivery status',
      'when will it arrive', 'shipping status', 'track my',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  private isAvailabilityIntent(text: string): boolean {
    const patterns = [
      'is it available', 'in stock', 'availability', 'can i get',
      'when available', 'delivery to', 'deliver to',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  private isCartIntent(text: string): boolean {
    const patterns = [
      'my cart', 'view cart', 'show cart', 'cart items', 'what\'s in my cart',
      'update cart', 'remove from cart',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  private isRecommendationIntent(text: string): boolean {
    const patterns = [
      'recommend', 'suggestion', 'what should i', 'best selling',
      'popular', 'trending', 'top rated', 'similar to',
    ];
    return this.matchesAnyPattern(text, patterns);
  }

  // Intent building methods

  private buildSearchIntent(
    lowerText: string,
    originalText: string,
    context?: UserContext,
  ): IntentFrame {
    const categoryId = this.resolveCategory(lowerText);
    const brands = this.extractBrands(lowerText);
    const priceRange = this.extractPriceRange(lowerText);
    const attributes = this.extractAttributes(lowerText);

    const filters: SearchFilters = {};
    if (priceRange.max) filters.priceMax = priceRange.max;
    if (priceRange.min) filters.priceMin = priceRange.min;
    if (brands.length) filters.brands = brands;
    if (this.detectInStockPreference(lowerText)) filters.inStock = true;

    const needClarification = !categoryId && !brands.length && this.isVagueQuery(lowerText);
    let clarificationQuestion: string | undefined;
    let suggestedOptions: string[] | undefined;

    if (needClarification) {
      const prompt = this.generateClarificationQuestion(Intent.PRODUCT_SEARCH, lowerText);
      if (prompt) {
        clarificationQuestion = prompt.question;
        suggestedOptions = prompt.options;
      }
    }

    return {
      intent: Intent.PRODUCT_SEARCH,
      canonicalCategoryId: categoryId,
      filters,
      query: originalText,
      entities: { brands, attributes },
      needClarification,
      confidence: this.calculateSearchConfidence(categoryId, brands, lowerText),
      clarificationQuestion,
      suggestedOptions,
    };
  }

  private buildCompareIntent(
    lowerText: string,
    originalText: string,
    context?: UserContext,
  ): IntentFrame {
    const productIds = this.extractProductReferences(lowerText);
    const needClarification = productIds.length < 2;

    let clarificationQuestion: string | undefined;
    let suggestedOptions: string[] | undefined;

    if (needClarification) {
      clarificationQuestion = 'Which products would you like to compare?';
      // Could suggest recently viewed products from context
      if (context?.recentlyViewed && context.recentlyViewed.length >= 2) {
        suggestedOptions = context.recentlyViewed.slice(0, 4);
      }
    }

    return {
      intent: Intent.PRODUCT_COMPARE,
      query: originalText,
      entities: { productIds },
      needClarification,
      confidence: productIds.length >= 2 ? 0.9 : 0.6,
      clarificationQuestion,
      suggestedOptions,
    };
  }

  private buildAddToCartIntent(lowerText: string, originalText: string): IntentFrame {
    const productRef = this.extractSingleProductReference(lowerText);
    const quantity = this.extractQuantity(lowerText);

    return {
      intent: Intent.ADD_TO_CART,
      query: originalText,
      entities: { productRef, quantity: quantity || 1 },
      needClarification: !productRef,
      confidence: productRef ? 0.95 : 0.6,
      clarificationQuestion: !productRef
        ? 'Which product would you like to add to your cart?'
        : undefined,
    };
  }

  private buildCheckoutIntent(lowerText: string, originalText: string): IntentFrame {
    return {
      intent: Intent.CHECKOUT,
      query: originalText,
      needClarification: false,
      confidence: 0.95,
    };
  }

  private buildOrderStatusIntent(lowerText: string, originalText: string): IntentFrame {
    const orderId = this.extractOrderId(lowerText);

    return {
      intent: Intent.ORDER_STATUS,
      query: originalText,
      entities: { orderId },
      needClarification: !orderId,
      confidence: orderId ? 0.95 : 0.7,
      clarificationQuestion: !orderId
        ? 'Which order would you like to track? Please provide your order ID.'
        : undefined,
    };
  }

  private buildAvailabilityIntent(lowerText: string, originalText: string): IntentFrame {
    const productRef = this.extractSingleProductReference(lowerText);
    const pincode = this.extractPincode(lowerText);

    return {
      intent: Intent.PRODUCT_SEARCH, // Will trigger availability check tool
      query: originalText,
      entities: { productRef, pincode, checkAvailability: true },
      needClarification: !productRef,
      confidence: productRef ? 0.9 : 0.6,
      clarificationQuestion: !productRef
        ? 'Which product\'s availability would you like to check?'
        : undefined,
    };
  }

  private buildCartIntent(lowerText: string, originalText: string): IntentFrame {
    if (lowerText.includes('remove')) {
      return {
        intent: Intent.REMOVE_FROM_CART,
        query: originalText,
        needClarification: false,
        confidence: 0.9,
      };
    }
    if (lowerText.includes('update') || lowerText.includes('change quantity')) {
      return {
        intent: Intent.UPDATE_CART_QTY,
        query: originalText,
        needClarification: false,
        confidence: 0.85,
      };
    }
    return {
      intent: Intent.GENERAL_CHAT, // Will show cart
      query: originalText,
      entities: { showCart: true },
      needClarification: false,
      confidence: 0.85,
    };
  }

  private buildRecommendationIntent(
    lowerText: string,
    originalText: string,
    context?: UserContext,
  ): IntentFrame {
    const categoryId = this.resolveCategory(lowerText);
    const recType = this.detectRecommendationType(lowerText);

    return {
      intent: Intent.PRODUCT_SEARCH, // Will trigger recommendations tool
      query: originalText,
      canonicalCategoryId: categoryId,
      entities: {
        recommendationType: recType,
        contextProductIds: context?.recentlyViewed?.slice(0, 3),
      },
      needClarification: false,
      confidence: 0.85,
    };
  }

  private buildGeneralChatIntent(lowerText: string, originalText: string): IntentFrame {
    return {
      intent: Intent.GENERAL_CHAT,
      query: originalText,
      needClarification: false,
      confidence: 0.5,
    };
  }

  private detectFollowUpIntent(text: string, context: UserContext): IntentFrame | null {
    // Handle follow-up responses to clarification questions
    if (context.conversationState === 'AWAITING_CLARIFICATION') {
      // User might be answering a clarification question
      // This would need more context about what was asked
      return null;
    }
    return null;
  }

  // Extraction helpers

  private matchesAnyPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private resolveCategory(text: string): string | undefined {
    for (const [categoryId, category] of Object.entries(this.taxonomy)) {
      const keywords = category.keywords || [];
      if (keywords.some((keyword: string) => text.includes(keyword.toLowerCase()))) {
        return categoryId;
      }
    }
    return undefined;
  }

  private extractBrands(text: string): string[] {
    const found: string[] = [];
    for (const brand of this.brands) {
      const allNames = [brand.name.toLowerCase(), ...brand.aliases.map(a => a.toLowerCase())];
      if (allNames.some(name => text.includes(name))) {
        found.push(brand.name);
      }
    }
    return found;
  }

  private extractPriceRange(text: string): { min?: number; max?: number } {
    const result: { min?: number; max?: number } = {};

    // "under 5000", "below 10k"
    const maxMatch = text.match(/(?:under|below|less than|max|upto|up to)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k)?/i);
    if (maxMatch) {
      let value = parseInt(maxMatch[1], 10);
      if (text.includes('k')) value *= 1000;
      result.max = value;
    }

    // "above 1000", "over 5k", "min 2000"
    const minMatch = text.match(/(?:above|over|more than|min|starting|from)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k)?/i);
    if (minMatch) {
      let value = parseInt(minMatch[1], 10);
      if (text.includes('k')) value *= 1000;
      result.min = value;
    }

    // "between 5000 and 10000"
    const rangeMatch = text.match(/between\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k)?\s*(?:and|to|-)\s*(?:rs\.?|inr|₹)?\s*(\d+)(?:k)?/i);
    if (rangeMatch) {
      let min = parseInt(rangeMatch[1], 10);
      let max = parseInt(rangeMatch[2], 10);
      if (text.includes('k')) {
        min *= 1000;
        max *= 1000;
      }
      result.min = min;
      result.max = max;
    }

    return result;
  }

  private extractAttributes(text: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    // Color extraction
    const colors = ['black', 'white', 'red', 'blue', 'green', 'silver', 'gold', 'pink', 'grey', 'gray'];
    for (const color of colors) {
      if (text.includes(color)) {
        attributes.color = color;
        break;
      }
    }

    // Size extraction
    const sizes = ['small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l'];
    for (const size of sizes) {
      if (new RegExp(`\\b${size}\\b`, 'i').test(text)) {
        attributes.size = size.toUpperCase();
        break;
      }
    }

    return attributes;
  }

  private detectInStockPreference(text: string): boolean {
    return text.includes('in stock') || text.includes('available');
  }

  private isVagueQuery(text: string): boolean {
    const words = text.split(/\s+/).filter(w => w.length > 2);
    // Not vague if it has price filters
    const hasPriceFilter = /(?:under|below|above|less than|more than|upto|up to|between|starting|from|max|min)\s*(?:rs\.?|inr|₹)?\s*\d+/i.test(text);
    if (hasPriceFilter) return false;
    return words.length < 2;
  }

  private calculateSearchConfidence(
    categoryId: string | undefined,
    brands: string[],
    text: string,
  ): number {
    let confidence = 0.5;
    if (categoryId) confidence += 0.25;
    if (brands.length > 0) confidence += 0.15;
    if (text.length > 10) confidence += 0.1;
    
    // Higher confidence if there's a price filter
    const hasPriceFilter = /(?:under|below|above|less than|more than|upto|up to|between|starting|from|max|min)\s*(?:rs\.?|inr|₹)?\s*\d+/i.test(text);
    if (hasPriceFilter) confidence += 0.2;
    
    return Math.min(confidence, 0.95);
  }

  private extractProductReferences(text: string): string[] {
    // This would need actual product ID patterns or context
    return [];
  }

  private extractSingleProductReference(text: string): string | undefined {
    // Would extract product ID or reference from text
    return undefined;
  }

  private extractQuantity(text: string): number | undefined {
    const match = text.match(/(\d+)\s*(?:units?|items?|pieces?)?/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractOrderId(text: string): string | undefined {
    const match = text.match(/(?:order\s*(?:id|#|number)?:?\s*)([A-Z0-9-]+)/i);
    return match ? match[1] : undefined;
  }

  private extractPincode(text: string): string | undefined {
    const match = text.match(/\b(\d{6})\b/);
    return match ? match[1] : undefined;
  }

  private detectRecommendationType(text: string): string {
    if (text.includes('similar')) return 'similar';
    if (text.includes('trending') || text.includes('popular')) return 'trending';
    if (text.includes('best selling') || text.includes('top')) return 'bestseller';
    if (text.includes('deal') || text.includes('discount')) return 'deals';
    return 'personalized';
  }

  private getDefaultClarificationPrompts(): Record<string, ClarificationPrompt[]> {
    return {
      [Intent.PRODUCT_SEARCH]: [
        {
          question: 'What type of product are you looking for?',
          options: ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports'],
          context: 'default',
        },
        {
          question: 'Could you tell me more about what you\'re looking for?',
          options: ['Show popular items', 'Browse categories', 'Show deals'],
          context: 'vague',
        },
      ],
      [Intent.PRODUCT_COMPARE]: [
        {
          question: 'Which products would you like to compare?',
          options: [],
          context: 'default',
        },
      ],
      [Intent.ADD_TO_CART]: [
        {
          question: 'Which product would you like to add to your cart?',
          options: [],
          context: 'default',
        },
      ],
    };
  }
}
