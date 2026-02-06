import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '../../common/config/config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MCPClient {
  private cachedToolDefinitions: any[] | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(private config: ConfigService) {}

  async executeTool(toolName: string, request: any, traceId?: string, authToken?: string): Promise<any> {
    const url = `${this.config.mcpToolServerUrl}/api/v1/tools/execute/${toolName}`;
    const tid = traceId || uuidv4();
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    console.log(`[${tid}] Executing MCP tool: ${toolName}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Trace-Id': tid,
    };

    // Add authorization header if token is provided
    if (authToken) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(url, request, {
          headers,
          timeout: 15000,
        });

        console.log(`[${tid}] Tool ${toolName} completed successfully (attempt ${attempt})`);
        return response.data;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryable = this.isRetryableError(error);

        console.error(`[${tid}] Tool ${toolName} failed (attempt ${attempt}/${maxRetries}):`, error.message);

        if (isLastAttempt || !isRetryable) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw new Error('Unexpected: retry loop completed without return or throw');
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.isAxiosError) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return true;
      }
      if (error.response && error.response.status >= 500) {
        return true;
      }
    }
    return false;
  }

  async getToolDefinitions(authToken?: string): Promise<any[]> {
    // Return cached definitions if still valid
    const now = Date.now();
    if (this.cachedToolDefinitions && (now - this.lastFetchTime) < this.CACHE_TTL) {
      return this.cachedToolDefinitions;
    }

    try {
      // Fetch tool metadata from tool-server
      const url = `${this.config.mcpToolServerUrl}/api/v1/tools`;
      const headers: Record<string, string> = {};

      // Add authorization header if token is provided
      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      }

      const response = await axios.get(url, { headers, timeout: 5000 });
      const toolsMetadata = response.data;

      // Convert tool metadata to LLM tool definition format
      const definitions = Object.entries(toolsMetadata).map(([name, metadata]: [string, any]) => {
        // Generate basic schema structure - in production, load actual schemas
        return {
          name,
          description: metadata.description,
          parameters: this.getParameterSchemaForTool(name),
        };
      });

      this.cachedToolDefinitions = definitions;
      this.lastFetchTime = now;
      console.log(`Loaded ${definitions.length} tool definitions from tool-server`);
      
      return definitions;
    } catch (error) {
      console.error('Failed to fetch tool definitions from tool-server, using fallback:', error.message);
      // Fallback to core-8 commerce tools
      return this.getFallbackToolDefinitions();
    }
  }

  private getParameterSchemaForTool(toolName: string): any {
    // Basic parameter schemas for core-8 tools
    const schemas: Record<string, any> = {
      'commerce.searchProducts': {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text' },
          filters: {
            type: 'object',
            properties: {
              categories: { type: 'array', items: { type: 'string' }, description: 'Category IDs to filter by' },
              priceMax: { type: 'number', description: 'Maximum price' },
              priceMin: { type: 'number', description: 'Minimum price' },
              brands: { type: 'array', items: { type: 'string' }, description: 'Brand names to filter by' },
              inStock: { type: 'boolean', description: 'Filter by in-stock items' },
            },
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1, default: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          },
        },
        required: ['query'],
      },
      'commerce.compareProducts': {
        type: 'object',
        properties: {
          productIds: { type: 'array', items: { type: 'string' }, description: 'Product IDs to compare (2-5 products)' },
        },
        required: ['productIds'],
      },
      'commerce.cart.addItem': {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          productId: { type: 'string' },
          provider: { type: 'string' },
          quantity: { type: 'number' },
        },
        required: ['userId', 'productId', 'provider', 'quantity'],
      },
      'commerce.cart.updateItemQty': {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          productId: { type: 'string' },
          quantity: { type: 'number' },
        },
        required: ['userId', 'productId', 'quantity'],
      },
      'commerce.cart.removeItem': {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          productId: { type: 'string' },
        },
        required: ['userId', 'productId'],
      },
      'commerce.cart.getCart': {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      'commerce.checkout.create': {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          cartId: { type: 'string' },
        },
        required: ['userId', 'cartId'],
      },
      'commerce.checkout.update': {
        type: 'object',
        properties: {
          checkoutId: { type: 'string' },
          shippingAddressId: { type: 'string' },
          paymentMethod: { type: 'string' },
        },
        required: ['checkoutId'],
      },
      'commerce.checkout.get': {
        type: 'object',
        properties: {
          checkoutId: { type: 'string' },
        },
        required: ['checkoutId'],
      },
      'commerce.checkout.complete': {
        type: 'object',
        properties: {
          checkoutId: { type: 'string' },
        },
        required: ['checkoutId'],
      },
      'commerce.checkout.cancel': {
        type: 'object',
        properties: {
          checkoutId: { type: 'string' },
        },
        required: ['checkoutId'],
      },
      'commerce.product.estimateShipping': {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          provider: { type: 'string' },
          pincode: { type: 'string' },
        },
        required: ['productId', 'provider', 'pincode'],
      },
      'commerce.product.listVariants': {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          provider: { type: 'string' },
        },
        required: ['productId', 'provider'],
      },
      'commerce.promotions.get': {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          provider: { type: 'string' },
        },
        required: ['productId', 'provider'],
      },
      'commerce.promotions.validateCoupon': {
        type: 'object',
        properties: {
          couponCode: { type: 'string' },
          cartId: { type: 'string' },
        },
        required: ['couponCode', 'cartId'],
      },
    };

    return schemas[toolName] || { type: 'object', properties: {} };
  }

  private getFallbackToolDefinitions(): any[] {
    return [
      {
        name: 'commerce.searchProducts',
        description: 'Search for products based on query and filters',
        parameters: this.getParameterSchemaForTool('commerce.searchProducts'),
      },
      {
        name: 'commerce.compareProducts',
        description: 'Compare multiple products side by side',
        parameters: this.getParameterSchemaForTool('commerce.compareProducts'),
      },
      {
        name: 'commerce.cart.addItem',
        description: 'Add a product to the user cart',
        parameters: this.getParameterSchemaForTool('commerce.cart.addItem'),
      },
      {
        name: 'commerce.cart.updateItemQty',
        description: 'Update cart item quantity',
        parameters: this.getParameterSchemaForTool('commerce.cart.updateItemQty'),
      },
      {
        name: 'commerce.cart.removeItem',
        description: 'Remove item from cart',
        parameters: this.getParameterSchemaForTool('commerce.cart.removeItem'),
      },
      {
        name: 'commerce.cart.getCart',
        description: 'Get the user cart contents',
        parameters: this.getParameterSchemaForTool('commerce.cart.getCart'),
      },
      {
        name: 'commerce.checkout.create',
        description: 'Create a checkout session from cart (freezes prices, 30-min validity)',
        parameters: this.getParameterSchemaForTool('commerce.checkout.create'),
      },
      {
        name: 'commerce.checkout.update',
        description: 'Update checkout session with shipping address and payment method',
        parameters: this.getParameterSchemaForTool('commerce.checkout.update'),
      },
      {
        name: 'commerce.checkout.get',
        description: 'Get checkout session details',
        parameters: this.getParameterSchemaForTool('commerce.checkout.get'),
      },
      {
        name: 'commerce.checkout.complete',
        description: 'Complete checkout and create order (requires confirmation for >₹50k)',
        parameters: this.getParameterSchemaForTool('commerce.checkout.complete'),
      },
      {
        name: 'commerce.checkout.cancel',
        description: 'Cancel checkout session',
        parameters: this.getParameterSchemaForTool('commerce.checkout.cancel'),
      },
      {
        name: 'commerce.product.estimateShipping',
        description: 'Estimate shipping cost and delivery time',
        parameters: this.getParameterSchemaForTool('commerce.product.estimateShipping'),
      },
      {
        name: 'commerce.product.listVariants',
        description: 'List product variants (size, color, etc)',
        parameters: this.getParameterSchemaForTool('commerce.product.listVariants'),
      },
      {
        name: 'commerce.promotions.get',
        description: 'Get active promotions for a product',
        parameters: this.getParameterSchemaForTool('commerce.promotions.get'),
      },
      {
        name: 'commerce.promotions.validateCoupon',
        description: 'Validate a coupon code',
        parameters: this.getParameterSchemaForTool('commerce.promotions.validateCoupon'),
      },
    ];
  }
}
