import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '../../common/config/config.service';

@Injectable()
export class CartService {
  constructor(private config: ConfigService) {}

  private async callTool(toolName: string, request: any) {
    const url = `${this.config.mcpToolServerUrl}/api/v1/tools/execute/${toolName}`;
    const response = await axios.post(url, request, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    return response.data;
  }

  async addItem(userId: string, productId: string, provider: string, quantity: number) {
    return this.callTool('commerce.cart.addItem', {
      userId,
      productId,
      provider,
      quantity,
    });
  }

  async updateItemQty(userId: string, productId: string, quantity: number) {
    return this.callTool('commerce.cart.updateItemQty', {
      userId,
      productId,
      quantity,
    });
  }

  async removeItem(userId: string, productId: string) {
    return this.callTool('commerce.cart.removeItem', {
      userId,
      productId,
    });
  }

  async getCart(userId: string) {
    return this.callTool('commerce.cart.getCart', { userId });
  }
}
