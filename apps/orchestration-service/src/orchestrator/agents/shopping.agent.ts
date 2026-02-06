import { Injectable } from '@nestjs/common';
import {
  BaseAgent,
  AgentCapability,
  AgentTask,
} from './base.agent';
import { StreamChunk } from '../llm/provider.interface';
import { Intent } from '../../common/types';
import { MCPClient } from '../tools/mcp.client';
import { SharedContextService } from './shared-context.service';

/**
 * Shopping Agent - Handles cart operations
 *
 * Responsibilities:
 * - Add items to cart
 * - Update cart item quantities
 * - Remove items from cart
 * - View cart contents
 * - Validate product availability before cart operations
 */
@Injectable()
export class ShoppingAgent extends BaseAgent {
  readonly name = 'ShoppingAgent';
  readonly capabilities = [
    AgentCapability.CART,
  ];
  readonly priority = 70; // High priority for cart operations

  protected readonly allowedDelegations = []; // No delegations needed

  constructor(
    private mcpClient: MCPClient,
    private sharedContext: SharedContextService,
  ) {
    super();
  }

  /**
   * Can handle cart-related intents
   */
  canHandle(task: AgentTask): boolean {
    return (
      task.intent === Intent.ADD_TO_CART ||
      task.intent === Intent.UPDATE_CART_QTY ||
      task.intent === Intent.REMOVE_FROM_CART ||
      task.type === 'ADD_TO_CART' ||
      task.type === 'UPDATE_CART_QTY' ||
      task.type === 'REMOVE_FROM_CART' ||
      task.type === 'VIEW_CART'
    );
  }

  /**
   * Execute cart operation
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
      if (task.intent === Intent.ADD_TO_CART) {
        yield* this.addToCart(task);
      } else if (task.intent === Intent.UPDATE_CART_QTY) {
        yield* this.updateCartQuantity(task);
      } else if (task.intent === Intent.REMOVE_FROM_CART) {
        yield* this.removeFromCart(task);
      } else if (task.type === 'VIEW_CART') {
        yield* this.viewCart(task);
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
        error: `Shopping Agent error: ${error.message}`,
      };
    }
  }

  /**
   * Add item to cart
   */
  private async *addToCart(task: AgentTask): AsyncGenerator<StreamChunk> {
    this.validateTaskParameters(task, ['productId', 'quantity']);

    const { productId, provider, quantity } = task.parameters;
    const userId = task.context.userId;

    this.log('info', 'Adding item to cart', {
      userId,
      productId,
      provider,
      quantity,
    });

    try {
      const result = await this.mcpClient.executeTool('commerce.cart.addItem', {
        userId,
        productId,
        provider: provider || 'default',
        quantity: quantity || 1,
        idempotencyKey: `${task.id}-add`,
      });

      if (result.ok && result.data) {
        yield {
          type: 'token',
          content: JSON.stringify({
            type: 'cart_updated',
            action: 'added',
            cart: result.data,
            message: `Added ${quantity || 1} item(s) to cart`,
          }, null, 2),
        };
      } else {
        throw new Error(result.error?.message || 'Failed to add item to cart');
      }

      yield { type: 'done' };
    } catch (error) {
      this.log('error', 'Add to cart failed', { error: error.message });
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Update cart item quantity
   */
  private async *updateCartQuantity(task: AgentTask): AsyncGenerator<StreamChunk> {
    this.validateTaskParameters(task, ['productId', 'quantity']);

    const { productId, quantity } = task.parameters;
    const userId = task.context.userId;

    this.log('info', 'Updating cart quantity', {
      userId,
      productId,
      quantity,
    });

    try {
      const result = await this.mcpClient.executeTool('commerce.cart.updateItemQty', {
        userId,
        productId,
        quantity,
        idempotencyKey: `${task.id}-update`,
      });

      if (result.ok && result.data) {
        yield {
          type: 'token',
          content: JSON.stringify({
            type: 'cart_updated',
            action: 'quantity_updated',
            cart: result.data,
            message: `Updated quantity to ${quantity}`,
          }, null, 2),
        };
      } else {
        throw new Error(result.error?.message || 'Failed to update cart quantity');
      }

      yield { type: 'done' };
    } catch (error) {
      this.log('error', 'Update cart quantity failed', { error: error.message });
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Remove item from cart
   */
  private async *removeFromCart(task: AgentTask): AsyncGenerator<StreamChunk> {
    this.validateTaskParameters(task, ['productId']);

    const { productId } = task.parameters;
    const userId = task.context.userId;

    this.log('info', 'Removing item from cart', {
      userId,
      productId,
    });

    try {
      const result = await this.mcpClient.executeTool('commerce.cart.removeItem', {
        userId,
        productId,
        idempotencyKey: `${task.id}-remove`,
      });

      if (result.ok && result.data) {
        yield {
          type: 'token',
          content: JSON.stringify({
            type: 'cart_updated',
            action: 'removed',
            cart: result.data,
            message: 'Item removed from cart',
          }, null, 2),
        };
      } else {
        throw new Error(result.error?.message || 'Failed to remove item from cart');
      }

      yield { type: 'done' };
    } catch (error) {
      this.log('error', 'Remove from cart failed', { error: error.message });
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }

  /**
   * View cart contents
   */
  private async *viewCart(task: AgentTask): AsyncGenerator<StreamChunk> {
    const userId = task.context.userId;

    this.log('info', 'Viewing cart', { userId });

    try {
      const result = await this.mcpClient.executeTool('commerce.cart.getCart', {
        userId,
      });

      if (result.ok && result.data) {
        yield {
          type: 'token',
          content: JSON.stringify({
            type: 'cart_view',
            cart: result.data,
            message: `Your cart has ${result.data.itemCount || 0} item(s)`,
          }, null, 2),
        };
      } else {
        throw new Error(result.error?.message || 'Failed to retrieve cart');
      }

      yield { type: 'done' };
    } catch (error) {
      this.log('error', 'View cart failed', { error: error.message });
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }
}
