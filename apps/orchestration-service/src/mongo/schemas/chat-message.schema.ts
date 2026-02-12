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

  @Prop({ required: true, index: true })
  session_id: string;

  @Prop({ index: true })
  user_id?: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system', 'tool'] })
  role: string;

  @Prop({ type: Number, default: 0 })
  sequence_id: number;

  @Prop()
  content_text?: string;

  @Prop({ type: Object })
  content_json?: Record<string, unknown>;

  @Prop({ maxlength: 100 })
  tool_name?: string;

  @Prop({ type: Object })
  tool_payload?: Record<string, unknown>;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  trace_id?: string;

  created_at?: Date;
}

export const MongoChatMessageSchema = SchemaFactory.createForClass(MongoChatMessage);
MongoChatMessageSchema.index({ session_id: 1, created_at: 1 });
MongoChatMessageSchema.index({ user_id: 1, created_at: -1 });
