import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: false },
  collection: 'chat_messages',
})
export class MongoChatMessage extends Document {
  @Prop({ type: String, default: () => uuidv4(), unique: true })
  message_id: string;

  @Prop({ required: false, index: true })
  chat_session_id?: string;

  /** Legacy: optional for backward compat with existing messages tied to auth sessionId. */
  @Prop({ index: true })
  sessionId?: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system', 'tool'] })
  role: string;

  @Prop({ maxlength: 64, default: 'TEXT' })
  message_type: string;

  @Prop()
  text?: string;

  @Prop({ default: 0 })
  message_index: number;

  @Prop({ maxlength: 100 })
  tool_name?: string;

  @Prop({ type: Object })
  tool_payload?: Record<string, unknown>;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  /** Legacy alias for text. */
  @Prop()
  content?: string;

  created_at?: Date;
}

export const MongoChatMessageSchema = SchemaFactory.createForClass(MongoChatMessage);
MongoChatMessageSchema.index({ chat_session_id: 1, created_at: 1 });
MongoChatMessageSchema.index({ sessionId: 1, created_at: 1 });
