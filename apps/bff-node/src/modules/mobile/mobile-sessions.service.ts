import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session } from '../../mongo/schemas/session.schema';
import { MongoChatSession } from '../../mongo/schemas/chat-session.schema';

@Injectable()
export class MobileSessionsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(MongoChatSession.name) private chatSessionModel: Model<MongoChatSession>,
  ) {}

  /**
   * Get all chat sessions (conversations) for a user
   */
  async findAllByUserId(userId: string): Promise<{ sessionId: string; createdAt: Date; lastActiveAt: Date }[]> {
    const sessions = await this.chatSessionModel
      .find({ user_id: userId })
      .sort({ last_active_at: -1 })
      .lean()
      .exec();
    return sessions.map((s) => ({
      sessionId: s.chat_session_id,
      createdAt: s.created_at,
      lastActiveAt: s.last_active_at,
    }));
  }

  async findBySessionId(sessionId: string): Promise<{ sessionId: string; createdAt: Date } | null> {
    const session = await this.chatSessionModel.findOne({ chat_session_id: sessionId }).lean().exec();
    if (!session) return null;
    return { sessionId: session.chat_session_id, createdAt: session.created_at };
  }

  async assertSessionBelongsToUser(sessionId: string, userId: string): Promise<void> {
    const session = await this.chatSessionModel.findOne({ chat_session_id: sessionId, user_id: userId }).exec();
    if (!session) {
      throw new Error('Session not found or access denied');
    }
  }
}
