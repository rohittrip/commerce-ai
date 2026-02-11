import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../common/database/database.service';
import { MongoChatSession, GUEST_SESSION_TTL_MS } from '../../mongo/schemas/chat-session.schema';
import { MongoChatMessage } from '../../mongo/schemas/chat-message.schema';
import { OrchestratorService } from '../../orchestrator/orchestrator.service';

@Injectable()
export class ChatService {
  constructor(
    private db: DatabaseService,
    @InjectModel(MongoChatSession.name) private chatSessionModel: Model<MongoChatSession>,
    @InjectModel(MongoChatMessage.name) private chatMessageModel: Model<MongoChatMessage>,
    private orchestrator: OrchestratorService,
  ) {}

  async createSession(
    userId: string | null,
    locale?: string,
    isGuest: boolean = false,
    deviceId?: string | null,
  ): Promise<{ sessionId: string; deviceId: string | null; isGuest: boolean; expiresAt?: Date }> {
    // For guests: use provided deviceId or generate a new one
    // deviceId identifies the device/browser across sessions
    // guest_id is now the deviceId (for linking sessions)
    const guestDeviceId = isGuest ? (deviceId || uuidv4()) : null;
    
    // Guest sessions expire after 12 hours
    const expiresAt = isGuest ? new Date(Date.now() + GUEST_SESSION_TTL_MS) : undefined;
    
    const doc = await this.chatSessionModel.create({
      user_id: userId,
      guest_id: guestDeviceId, // This is now the device identifier
      locale: locale || 'en-IN',
      channel: 'MOBILE_APP',
      session_type: isGuest ? 'GUEST' : 'CUSTOMER',
      status: 'ACTIVE',
      expires_at: expiresAt,
    });
    
    return {
      sessionId: doc.chat_session_id,
      deviceId: guestDeviceId, // Return so client can store it
      isGuest,
      expiresAt,
    };
  }

  /**
   * Get all active sessions for a guest device (by deviceId/guest_id)
   */
  async getGuestSessions(deviceId: string) {
    const sessions = await this.chatSessionModel
      .find({ guest_id: deviceId, session_type: 'GUEST', status: 'ACTIVE' })
      .sort({ created_at: -1 })
      .lean()
      .exec();
    
    return sessions.map((s) => ({
      id: s.chat_session_id,
      created_at: s.created_at,
      last_active_at: s.last_active_at,
      locale: s.locale,
      status: (s as any).status,
    }));
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.chatSessionModel
      .updateOne(
        { chat_session_id: sessionId, status: 'ACTIVE' },
        { 
          $set: { 
            status: 'ENDED', 
            ended_at: new Date(),
            expires_at: null, // Remove TTL so ended sessions aren't auto-deleted
          } 
        },
      )
      .exec();
    
    if (result.modifiedCount === 0) {
      return { success: false, message: 'Session not found or already ended' };
    }
    
    return { success: true, message: 'Session ended successfully' };
  }

  async getSession(sessionId: string) {
    const doc = await this.chatSessionModel
      .findOne({ chat_session_id: sessionId })
      .lean()
      .exec();
    if (!doc) return null;
    return {
      id: doc.chat_session_id,
      user_id: doc.user_id,
      guest_id: doc.guest_id,
      session_type: doc.session_type,
      status: (doc as any).status || 'ACTIVE',
      created_at: doc.created_at,
      updated_at: doc.last_active_at,
      locale: doc.locale,
      expires_at: (doc as any).expires_at,
      ended_at: (doc as any).ended_at,
    };
  }

  async *processMessage(sessionId: string, userId: string | null, message: string) {
    // Update last active timestamp
    await this.chatSessionModel
      .updateOne(
        { chat_session_id: sessionId },
        { $set: { last_active_at: new Date() } },
      )
      .exec();

    // If no userId (guest), get guest_id from session
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const session = await this.chatSessionModel
        .findOne({ chat_session_id: sessionId })
        .lean()
        .exec();
      effectiveUserId = session?.guest_id || `guest-${sessionId}`;
    }

    yield* this.orchestrator.processMessage(sessionId, effectiveUserId, message);
  }

  async getMessages(sessionId: string, limit: number = 10, before?: string) {
    const query: any = { $or: [{ chat_session_id: sessionId }, { sessionId }, { session_id: sessionId }] };
    
    // If 'before' cursor is provided, fetch messages older than that timestamp
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }
    
    const messages = await this.chatMessageModel
      .find(query)
      .sort({ created_at: -1 }) // Sort descending to get latest first
      .limit(limit + 1) // Fetch one extra to check if there are more
      .lean()
      .exec();
    
    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;
    
    // Reverse to return in chronological order (oldest first)
    const chronologicalMessages = resultMessages.reverse();
    
    return {
      messages: chronologicalMessages.map((m: any) => ({
        id: m.message_id ?? m._id?.toString(),
        role: m.role,
        content_text: m.content_text ?? m.text ?? m.content ?? '',
        created_at: m.created_at,
      })),
      hasMore,
      oldestTimestamp: chronologicalMessages.length > 0 ? chronologicalMessages[0].created_at : null,
    };
  }

  async submitFeedback(sessionId: string, messageId: string, rating: number, reason?: string) {
    await this.db.query(
      `INSERT INTO feedback (id, session_id, message_id, rating, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), sessionId, messageId, rating, reason]
    );
  }
}
