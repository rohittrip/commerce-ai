import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MongoAddressEntrySchema, MongoAddressEntry } from './address.schema';

@Schema({ timestamps: true, collection: 'user_addresses' })
export class MongoUserAddress extends Document {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: [MongoAddressEntrySchema], default: [] })
  addresses: MongoAddressEntry[];
}

export const MongoUserAddressSchema = SchemaFactory.createForClass(MongoUserAddress);
