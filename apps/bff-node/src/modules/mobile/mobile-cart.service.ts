import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from '../../mongo/schemas/cart.schema';

export interface CartItemDto {
  productId: string;
  provider?: string;
  qty: number;
  unitPrice?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MobileCartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
  ) {}

  async saveCart(userId: string, items: CartItemDto[]): Promise<{ userId: string; items: CartItemDto[] }> {
    const cart = await this.cartModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          items: items.map((i) => ({
            productId: i.productId,
            provider: i.provider ?? 'default',
            qty: i.qty,
            unitPrice: i.unitPrice,
            metadata: i.metadata ?? {},
          })),
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    ).exec();
    return {
      userId: cart.userId,
      items: cart.items.map((i) => ({
        productId: i.productId,
        provider: i.provider,
        qty: i.qty,
        unitPrice: i.unitPrice,
        metadata: i.metadata,
      })),
    };
  }

  async getCart(userId: string): Promise<{ userId: string; items: CartItemDto[] } | null> {
    const cart = await this.cartModel.findOne({ userId }).lean().exec();
    if (!cart) return null;
    return {
      userId: cart.userId,
      items: cart.items.map((i) => ({
        productId: i.productId,
        provider: i.provider,
        qty: i.qty,
        unitPrice: i.unitPrice,
        metadata: i.metadata,
      })),
    };
  }
}
