import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CartItem, CartItemSchema } from './cart-item.schema';

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
