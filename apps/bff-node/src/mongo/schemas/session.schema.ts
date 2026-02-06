import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Session extends Document {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  mobile: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ default: 'en' })
  locale?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ userId: 1, createdAt: -1 });
