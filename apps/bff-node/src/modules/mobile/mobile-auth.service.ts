import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '../../common/config/config.service';
import { MongoUser } from '../../mongo/schemas/user.schema';
import { Session } from '../../mongo/schemas/session.schema';
import { MongoChatSession } from '../../mongo/schemas/chat-session.schema';

/** Mock: accept this fixed OTP for testing. */
const MOCK_OTP_FALLBACK = '1234';

@Injectable()
export class MobileAuthService {
  constructor(
    @InjectModel(MongoUser.name) private userModel: Model<MongoUser>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(MongoChatSession.name) private chatSessionModel: Model<MongoChatSession>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /** Mock: always returns success. Replace with third-party OTP send later. */
  async generateOtp(mobile: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `OTP sent. For mock, use last 4 digits of mobile or ${MOCK_OTP_FALLBACK} for testing.`,
    };
  }

  /**
   * Mock OTP verification: valid if OTP equals last 4 digits of mobile, or fixed 1234.
   * Replace with third-party verification later.
   */
  private isOtpValid(mobile: string, otp: string): boolean {
    if (otp === MOCK_OTP_FALLBACK) return true;
    const last4 = mobile.slice(-4);
    return last4.length === 4 && otp === last4;
  }

  /**
   * Validate OTP. On success: create/find user, create user session (auth session),
   * optionally upgrade guest chat sessions to user sessions, return JWT + sessionId.
   */
  async validateOtp(
    mobile: string,
    otp: string,
    guestId?: string,
  ): Promise<{
    accessToken: string;
    sessionId: string;
    userId: string;
    mobile: string;
    upgradedChatSessionIds?: string[];
  }> {
    if (!this.isOtpValid(mobile, otp)) {
      throw new Error('Invalid OTP');
    }

    const phone_country = '91';
    const phone_number = mobile;
    const mobileKey = `${phone_country}|${phone_number}`;

    let user = await this.userModel.findOne({ mobile: mobileKey }).exec();
    if (!user) {
      user = await this.userModel.findOne({ phone_country, phone_number }).exec();
    }
    if (!user) {
      user = await this.userModel.findOne({ mobile }).exec();
    }
    if (!user) {
      user = await this.userModel.create({
        phone_country,
        phone_number,
        mobile: mobileKey,
        role: 'customer',
      });
    }

    const userId = (user as { user_id?: string }).user_id ?? String(user._id);

    // Create user session (auth session)
    const sessionId = uuidv4();
    await this.sessionModel.create({
      sessionId,
      mobile: mobileKey,
      userId,
      locale: 'en',
    });

    // Upgrade guest chat sessions to user sessions when guest_id is provided
    let upgradedChatSessionIds: string[] = [];
    if (guestId && guestId.trim()) {
      const guestSessions = await this.chatSessionModel
        .find({ guest_id: guestId.trim(), user_id: null })
        .select('chat_session_id')
        .lean()
        .exec();
      const ids = guestSessions.map((s) => (s as any).chat_session_id).filter(Boolean);
      if (ids.length > 0) {
        await this.chatSessionModel
          .updateMany(
            { guest_id: guestId.trim(), user_id: null },
            { 
              $set: { user_id: userId, session_type: 'CUSTOMER' }, 
              $unset: { guest_id: 1 } 
            },
          )
          .exec();
        upgradedChatSessionIds = ids;
        console.log(`Upgraded ${ids.length} guest session(s) to user ${userId}:`, ids);
      }
    }

    const payload = {
      sub: userId,
      mobile: mobileKey,
      role: (user as { role?: string }).role ?? 'customer',
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.jwtSecret,
      expiresIn: this.config.jwtExpiresIn,
    });

    const response: {
      accessToken: string;
      sessionId: string;
      userId: string;
      mobile: string;
      upgradedChatSessionIds?: string[];
    } = {
      accessToken,
      sessionId,
      userId,
      mobile: mobileKey,
    };
    if (upgradedChatSessionIds.length > 0) {
      response.upgradedChatSessionIds = upgradedChatSessionIds;
    }
    return response;
  }
}
