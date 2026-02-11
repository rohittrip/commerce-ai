import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'otp_requests' })
export class MongoOtpRequest extends Document {
  @Prop({ type: String, default: () => `otpreq_${uuidv4().replace(/-/g, '').slice(0, 12)}`, unique: true })
  otpRequestId: string;

  @Prop({ required: true, maxlength: 8 })
  phoneCountry: string;

  @Prop({ required: true, maxlength: 32 })
  phoneNumber: string;

  @Prop({ required: true, maxlength: 6 })
  otp: string;

  @Prop({ enum: ['sms', 'whatsapp', 'email'], default: 'sms' })
  channel: string;

  @Prop({ enum: ['LOGIN', 'SIGNUP', 'RESET_PASSWORD', 'VERIFY_PHONE'], default: 'LOGIN' })
  purpose: string;

  @Prop({ required: true })
  deviceId: string;

  @Prop()
  platform?: string;

  @Prop()
  appVersion?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true })
  resendAvailableAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 3 })
  maxAttempts: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MongoOtpRequestSchema = SchemaFactory.createForClass(MongoOtpRequest);

// Index for quick lookup by otpRequestId
MongoOtpRequestSchema.index({ otpRequestId: 1 });

// Index for finding OTP by phone (to check rate limiting)
MongoOtpRequestSchema.index({ phoneCountry: 1, phoneNumber: 1, createdAt: -1 });

// TTL index to auto-delete expired OTP requests after 24 hours
MongoOtpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
