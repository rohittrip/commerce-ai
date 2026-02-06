import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MongoUserAddressDocSchema } from './address.schema';

@Schema({ timestamps: true, collection: 'user_address' })
export class MongoUserAddress extends Document {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: MongoUserAddressDocSchema, required: true })
  addresses: { shipping: any; billing: any };
}

export const MongoUserAddressSchema = SchemaFactory.createForClass(MongoUserAddress);
