import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoChatMessage } from '../../mongo/schemas/chat-message.schema';
import { MobileSessionsService } from './mobile-sessions.service';

@Injectable()
export class MobileChatService {
  constructor(
    @InjectModel(MongoChatMessage.name) private messageModel: Model<MongoChatMessage>,
    private sessionsService: MobileSessionsService,
  ) {}

  async getMessages(sessionId: string, userId: string): Promise<{ role: string; content: string; createdAt: Date }[]> {
    await this.sessionsService.assertSessionBelongsToUser(sessionId, userId);
    const messages = await this.messageModel
      .find({ sessionId })
      .sort({ created_at: 1 })
      .lean()
      .exec();
    return messages.map((m) => ({
      role: m.role,
      content: m.content || '',
      createdAt: m.created_at as Date,
    }));
  }

  async addMessage(sessionId: string, userId: string, role: string, content: string): Promise<{ id: string; role: string; content: string; createdAt: Date }> {
    await this.sessionsService.assertSessionBelongsToUser(sessionId, userId);
    const doc = await this.messageModel.create({
      sessionId,
      role,
      content,
      text: content,
      message_type: 'TEXT',
    });
    return {
      id: String(doc._id),
      role: doc.role,
      content: doc.content || '',
      createdAt: doc.created_at as Date,
    };
  }

  /** Get last N messages for context (e.g. for LLM). */
  async getLastMessages(sessionId: string, limit: number = 10): Promise<{ role: string; content: string }[]> {
    const messages = await this.messageModel
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return messages.reverse().map((m) => ({ role: m.role, content: m.content || '' }));
  }
}
