import { Injectable } from '@nestjs/common';
import { LLMRouter } from './router';
import { LLMMessage } from './provider.interface';
import { Intent } from '../../common/types';

/**
 * Agent routing result from LLM analysis
 */
export interface AgentRoutingResult {
  targetAgent: string;
  intent: Intent;
  confidence: number;
  reasoning: string;
}

/**
 * Search filters extracted from natural language
 */
export interface ExtractedSearchFilters {
  query: string;
  category?: string;
  budget?: {
    min?: number;
    max?: number;
  };
  brands?: string[];
  attributes?: Record<string, string>;
  sortBy?: string;
  inStock?: boolean;
}

/**
 * Cart action extracted from natural language
 */
export interface ExtractedCartAction {
  action: 'add' | 'update' | 'remove' | 'view';
  productReference?: string;
  quantity?: number;
}

/**
 * LLM Extraction Service
 * 
 * Provides structured extraction capabilities using LLM for:
 * - Agent routing / intent detection
 * - Search filter extraction
 * - Cart action extraction
 * - Entity extraction
 */
@Injectable()
export class LLMExtractionService {
  constructor(private llmRouter: LLMRouter) {}

  /**
   * Detect which agent should handle the user's request
   */
  async detectAgentRouting(userMessage: string): Promise<AgentRoutingResult> {
    console.log(`[LLM-Extraction] detectAgentRouting called with: "${userMessage}"`);
    const startTime = Date.now();
    const systemPrompt = `You are an AI assistant that analyzes user messages and determines the best specialized agent to handle them.

Available Agents:
1. ProductBrowsingAgent - Handles: product search, product discovery, product comparison, browsing categories, finding items
2. ShoppingAgent - Handles: adding items to cart, updating cart quantities, removing items from cart, viewing cart
3. CheckoutAgent - Handles: checkout process, placing orders, payment, order completion
4. CustomerSupportAgent - Handles: order tracking, order status, returns, refunds, policies, help

Analyze the user's intent and respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "targetAgent": "AgentName or null for general chat",
  "intent": "PRODUCT_SEARCH|PRODUCT_COMPARE|ADD_TO_CART|UPDATE_CART_QTY|REMOVE_FROM_CART|CHECKOUT|CREATE_ORDER|ORDER_STATUS|POLICY_QA|GENERAL_CHAT",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of why this agent was chosen"
}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.collectLLMResponse(messages);
      console.log(`[LLM-Extraction] LLM raw response (${Date.now() - startTime}ms): ${response.substring(0, 200)}...`);
      const parsed = this.parseJSON<AgentRoutingResult>(response);
      
      // Validate and normalize
      const result = {
        targetAgent: parsed.targetAgent || 'LeaderAgent',
        intent: this.normalizeIntent(parsed.intent),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
      console.log(`[LLM-Extraction] Agent routing result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('[LLM-Extraction] Agent routing extraction failed:', error);
      return {
        targetAgent: 'LeaderAgent',
        intent: Intent.GENERAL_CHAT,
        confidence: 0.3,
        reasoning: 'Fallback due to extraction error',
      };
    }
  }

  /**
   * Extract search filters from natural language query
   */
  async extractSearchFilters(userMessage: string): Promise<ExtractedSearchFilters> {
    console.log(`[LLM-Extraction] extractSearchFilters called with: "${userMessage}"`);
    const startTime = Date.now();
    const systemPrompt = `You are an AI assistant that extracts structured search parameters from shopping queries.

Analyze the user's message and extract:
- query: The main product/item they're searching for
- category: Product category (electronics, mobile, laptop, fashion, clothing, shoes, home, kitchen, beauty, sports, books, toys, etc.)
- budget: Price range in INR (Indian Rupees). Parse "under 10k" as max:10000, "above 5000" as min:5000, "between 5k-10k" as min:5000,max:10000
- brands: Any brand names mentioned (Samsung, Apple, Nike, Sony, etc.)
- attributes: Specific features like color, size, storage, RAM, etc.
- sortBy: Sorting preference (price_low, price_high, rating, newest, popularity)
- inStock: Whether they specifically want in-stock items

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "query": "main search term",
  "category": "category or null",
  "budget": {"min": number or null, "max": number or null},
  "brands": ["brand1", "brand2"] or [],
  "attributes": {"color": "value", "size": "value"} or {},
  "sortBy": "sort option or null",
  "inStock": true/false or null
}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.collectLLMResponse(messages);
      console.log(`[LLM-Extraction] Search filters LLM response (${Date.now() - startTime}ms): ${response.substring(0, 200)}...`);
      const parsed = this.parseJSON<ExtractedSearchFilters>(response);
      
      const result = {
        query: parsed.query || userMessage,
        category: parsed.category || undefined,
        budget: parsed.budget?.min || parsed.budget?.max ? parsed.budget : undefined,
        brands: parsed.brands?.length ? parsed.brands : undefined,
        attributes: Object.keys(parsed.attributes || {}).length ? parsed.attributes : undefined,
        sortBy: parsed.sortBy || undefined,
        inStock: parsed.inStock ?? undefined,
      };
      console.log(`[LLM-Extraction] Extracted search filters: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error('[LLM-Extraction] Search filter extraction failed:', error);
      return {
        query: userMessage,
      };
    }
  }

  /**
   * Extract cart action from natural language
   */
  async extractCartAction(userMessage: string): Promise<ExtractedCartAction> {
    const systemPrompt = `You are an AI assistant that extracts cart-related actions from user messages.

Analyze the user's message and extract:
- action: What they want to do (add, update, remove, view)
- productReference: Product name, ID, or description they're referring to
- quantity: Number of items (default 1 for add)

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "action": "add|update|remove|view",
  "productReference": "product name or null",
  "quantity": number or null
}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await this.collectLLMResponse(messages);
      const parsed = this.parseJSON<ExtractedCartAction>(response);
      
      return {
        action: parsed.action || 'view',
        productReference: parsed.productReference || undefined,
        quantity: parsed.quantity || 1,
      };
    } catch (error) {
      console.error('Cart action extraction failed:', error);
      return {
        action: 'view',
      };
    }
  }

  /**
   * Generate a natural language response for the user
   */
  async generateResponse(
    context: string,
    userMessage: string,
    data?: any,
  ): Promise<string> {
    const systemPrompt = `You are a helpful e-commerce shopping assistant. Be concise, friendly, and helpful.

Context: ${context}

${data ? `Available data:\n${JSON.stringify(data, null, 2)}` : ''}

Provide a natural, conversational response to help the user.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      return await this.collectLLMResponse(messages);
    } catch (error) {
      console.error('Response generation failed:', error);
      return "I'm here to help with your shopping needs. Could you please tell me what you're looking for?";
    }
  }

  /**
   * Collect complete LLM response from streaming
   */
  private async collectLLMResponse(messages: LLMMessage[]): Promise<string> {
    let response = '';
    
    for await (const chunk of this.llmRouter.generateResponse(messages, [])) {
      if (chunk.type === 'token' && chunk.content) {
        response += chunk.content;
      } else if (chunk.type === 'error') {
        throw new Error(chunk.error);
      }
    }
    
    return response.trim();
  }

  /**
   * Parse JSON from LLM response, handling common issues
   */
  private parseJSON<T>(response: string): T {
    // Remove markdown code blocks if present
    let cleaned = response
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', e, 'Response:', response);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  /**
   * Normalize intent string to Intent enum
   */
  private normalizeIntent(intentStr: string): Intent {
    const mapping: Record<string, Intent> = {
      'PRODUCT_SEARCH': Intent.PRODUCT_SEARCH,
      'PRODUCT_COMPARE': Intent.PRODUCT_COMPARE,
      'ADD_TO_CART': Intent.ADD_TO_CART,
      'UPDATE_CART_QTY': Intent.UPDATE_CART_QTY,
      'REMOVE_FROM_CART': Intent.REMOVE_FROM_CART,
      'CHECKOUT': Intent.CHECKOUT,
      'CREATE_ORDER': Intent.CREATE_ORDER,
      'ORDER_STATUS': Intent.ORDER_STATUS,
      'POLICY_QA': Intent.POLICY_QA,
      'GENERAL_CHAT': Intent.GENERAL_CHAT,
    };
    
    return mapping[intentStr?.toUpperCase()] || Intent.GENERAL_CHAT;
  }
}
