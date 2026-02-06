import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CartItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ default: 'default' })
  provider?: string;

  @Prop({ required: true, default: 1 })
  qty: number;

  @Prop()
  unitPrice?: number;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
