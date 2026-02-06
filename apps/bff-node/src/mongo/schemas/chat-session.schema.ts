import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/** 12 hours in milliseconds */
export const GUEST_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: false },
  collection: 'chat_sessions',
})
export class MongoChatSession extends Document {
  @Prop({ type: String, default: () => uuidv4(), unique: true })
  chat_session_id: string;

  @Prop({ default: null })
  user_id: string | null;

  /** Anonymous guest identifier; set for guest sessions, cleared when upgraded to user. */
  @Prop({ default: null, index: true })
  guest_id: string | null;

  @Prop({ maxlength: 32, default: 'CUSTOMER' })
  session_type: string;

  /** Session status: ACTIVE, ENDED, EXPIRED */
  @Prop({ maxlength: 16, default: 'ACTIVE' })
  status: string;

  @Prop({ maxlength: 32, default: 'MOBILE_APP' })
  channel: string;

  @Prop({ maxlength: 16, default: 'en-IN' })
  locale: string;

  @Prop({ maxlength: 20 })
  chat_intent?: string;

  @Prop({ maxlength: 32 })
  device_type?: string;

  @Prop({ maxlength: 32, default: 'NONE' })
  feedback_status: string;

  @Prop()
  avg_response_latency_ms?: number;

  @Prop({ default: 0 })
  error_count: number;

  created_at?: Date;

  @Prop({ default: () => new Date() })
  last_active_at: Date;

  /** For guest sessions: auto-expire after 12 hours. Null for user sessions. */
  @Prop({ type: Date })
  expires_at?: Date;

  @Prop()
  ended_at?: Date;
}

export const MongoChatSessionSchema = SchemaFactory.createForClass(MongoChatSession);
MongoChatSessionSchema.index({ user_id: 1, created_at: -1 });
MongoChatSessionSchema.index({ guest_id: 1 });
MongoChatSessionSchema.index({ last_active_at: -1 });
// TTL index: MongoDB will auto-delete documents when expires_at is reached
MongoChatSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, sparse: true });
