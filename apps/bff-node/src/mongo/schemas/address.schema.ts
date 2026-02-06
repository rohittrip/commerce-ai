import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class MongoAddressFields {
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

  @Prop({ default: 'IN' })
  country?: string;
}

export const MongoAddressFieldsSchema = SchemaFactory.createForClass(MongoAddressFields);

@Schema({ _id: false })
export class MongoUserAddressDoc {
  @Prop({ type: MongoAddressFieldsSchema })
  shipping: MongoAddressFields;

  @Prop({ type: MongoAddressFieldsSchema })
  billing: MongoAddressFields;
}

export const MongoUserAddressDocSchema = SchemaFactory.createForClass(MongoUserAddressDoc);
