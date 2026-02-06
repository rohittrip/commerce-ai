import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'users',
})
export class MongoUser extends Document {
  @Prop({ type: String, default: () => uuidv4(), unique: true })
  user_id: string;

  @Prop({ required: true, maxlength: 8 })
  phone_country: string;

  @Prop({ required: true, maxlength: 32 })
  phone_number: string;

  @Prop({ maxlength: 254 })
  email?: string;

  @Prop({ maxlength: 20, default: 'active' })
  status: string;

  @Prop({ default: false })
  is_phone_verified: boolean;

  @Prop({ default: false })
  is_email_verified: boolean;

  @Prop({ maxlength: 120 })
  full_name?: string;

  @Prop()
  profile_image_url?: string;

  @Prop({ maxlength: 20 })
  gender?: string;

  @Prop({ default: false })
  is_marketing_opt_in: boolean;

  @Prop({ default: true })
  is_notification_enabled: boolean;

  @Prop({ default: true })
  is_new_user: boolean;

  /** Legacy: optional for backward compat with auth lookup by single mobile string. */
  @Prop({ sparse: true })
  mobile?: string;

  @Prop({ default: 'customer' })
  role?: string;

  created_at?: Date;
  updated_at?: Date;
}

export const MongoUserSchema = SchemaFactory.createForClass(MongoUser);

MongoUserSchema.index({ phone_country: 1, phone_number: 1 }, { unique: true, sparse: true });
MongoUserSchema.index({ email: 1 }, { unique: true, sparse: true });
