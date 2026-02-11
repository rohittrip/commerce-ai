import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';

// Address types
export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}

@Schema({ _id: false })
export class MongoAddressFields {
  @Prop()
  fullName?: string;

  @Prop()
  phone?: string;

  @Prop({ required: true })
  line1: string;

  @Prop()
  line2?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  pincode?: string;

  @Prop()
  postalCode?: string;

  @Prop({ default: 'IN' })
  country?: string;
}

export const MongoAddressFieldsSchema = SchemaFactory.createForClass(MongoAddressFields);

// Single address entry with type and default flag
@Schema({ _id: false })
export class MongoAddressEntry {
  @Prop({ required: true, default: () => uuidv4() })
  addressId: string;

  @Prop({ required: true, enum: AddressType, default: AddressType.HOME })
  type: AddressType;

  @Prop()
  label?: string; // Custom label like "Mom's house"

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: MongoAddressFieldsSchema, required: true })
  address: MongoAddressFields;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MongoAddressEntrySchema = SchemaFactory.createForClass(MongoAddressEntry);

// Legacy schema for backward compatibility
@Schema({ _id: false })
export class MongoUserAddressDoc {
  @Prop({ type: MongoAddressFieldsSchema })
  shipping: MongoAddressFields;

  @Prop({ type: MongoAddressFieldsSchema })
  billing: MongoAddressFields;
}

export const MongoUserAddressDocSchema = SchemaFactory.createForClass(MongoUserAddressDoc);
