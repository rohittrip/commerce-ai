import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '../../common/config/config.service';
import { MongoUser } from '../../mongo/schemas/user.schema';
import { Session } from '../../mongo/schemas/session.schema';
import { MongoOtpRequest } from '../../mongo/schemas/otp-request.schema';
import { v4 as uuidv4 } from 'uuid';

export interface OtpRequestParams {
  phone: { countryCode: string; number: string };
  channel: string;
  purpose: string;
  device: { deviceId: string; platform?: string; appVersion?: string };
}

export interface OtpVerifyParams {
  otpRequestId: string;
  otp: string;
  device: { deviceId: string };
}

export interface OtpRequestResult {
  otpRequestId: string;
  expiresInSec: number;
  resendAvailableInSec: number;
}

export interface OtpVerifyResult {
  auth: {
    accessToken: string;
    expiresInSec: number;
    refreshToken: string;
    refreshExpiresInSec: number;
  };
  user: {
    userId: string;
    name: string;
    phone: { countryCode: string; number: string };
    isNewUser: boolean;
  };
}

@Injectable()
export class OtpAuthService {
  constructor(
    @InjectModel(MongoUser.name) private userModel: Model<MongoUser>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(MongoOtpRequest.name) private otpRequestModel: Model<MongoOtpRequest>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Request OTP - creates an OTP request record and returns the request ID
   */
  async requestOtp(params: OtpRequestParams): Promise<OtpRequestResult> {
    const { phone, channel, purpose, device } = params;

    // Generate OTP (in production, generate random; for testing, use dummy)
    const otp = this.config.dummyOtp; // '1234' for testing

    // Calculate expiry times
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.otpExpiresInSec * 1000);
    const resendAvailableAt = new Date(now.getTime() + this.config.otpResendAvailableInSec * 1000);

    // Normalize country code (remove + if present)
    const normalizedCountry = phone.countryCode.replace(/^\+/, '');

    // Create OTP request record
    const otpRequest = await this.otpRequestModel.create({
      phoneCountry: normalizedCountry,
      phoneNumber: phone.number,
      otp,
      channel,
      purpose,
      deviceId: device.deviceId,
      platform: device.platform,
      appVersion: device.appVersion,
      expiresAt,
      resendAvailableAt,
    });

    // In production: Send OTP via SMS/WhatsApp/Email here
    // For testing, we just return the request ID

    return {
      otpRequestId: otpRequest.otpRequestId,
      expiresInSec: this.config.otpExpiresInSec,
      resendAvailableInSec: this.config.otpResendAvailableInSec,
    };
  }

  /**
   * Verify OTP - validates OTP and device, returns auth tokens and user info
   */
  async verifyOtp(params: OtpVerifyParams): Promise<OtpVerifyResult> {
    const { otpRequestId, otp, device } = params;

    // Find the OTP request
    const otpRequest = await this.otpRequestModel.findOne({ otpRequestId }).exec();

    if (!otpRequest) {
      throw new BadRequestException('Invalid OTP request ID');
    }

    // Check if already used
    if (otpRequest.isUsed) {
      throw new BadRequestException('OTP has already been used');
    }

    // Check if expired
    if (new Date() > otpRequest.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    // Check device ID matches
    if (otpRequest.deviceId !== device.deviceId) {
      throw new BadRequestException('Device mismatch. Please request OTP again from this device.');
    }

    // Check max attempts
    if (otpRequest.attempts >= otpRequest.maxAttempts) {
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    // Increment attempts
    otpRequest.attempts += 1;
    await otpRequest.save();

    // Validate OTP (also accept last 4 digits of phone number for testing convenience)
    const last4Digits = otpRequest.phoneNumber.slice(-4);
    const isValidOtp = otpRequest.otp === otp || last4Digits === otp;
    
    if (!isValidOtp) {
      const remainingAttempts = otpRequest.maxAttempts - otpRequest.attempts;
      throw new BadRequestException(
        `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      );
    }

    // Mark OTP as used
    otpRequest.isUsed = true;
    await otpRequest.save();

    // Find or create user (using snake_case field names as per current schema)
    let user = await this.userModel
      .findOne({
        phone_country: otpRequest.phoneCountry,
        phone_number: otpRequest.phoneNumber,
      })
      .exec();

    let isNewUser = false;

    if (!user) {
      user = await this.userModel.create({
        phone_country: otpRequest.phoneCountry,
        phone_number: otpRequest.phoneNumber,
        mobile: `${otpRequest.phoneCountry}|${otpRequest.phoneNumber}`,
        status: 'active',
        is_phone_verified: true,
        is_new_user: true,
        role: 'customer',
      });
      isNewUser = true;
    } else {
      if (!user.is_phone_verified) {
        user.is_phone_verified = true;
        await user.save();
      }
      isNewUser = user.is_new_user;
    }

    const userId = user.user_id;

    // Create session
    const sessionId = uuidv4();
    await this.sessionModel.create({
      sessionId,
      mobile: `${otpRequest.phoneCountry}|${otpRequest.phoneNumber}`,
      userId,
      locale: 'en',
    });

    // Generate tokens
    const accessTokenPayload = {
      sub: userId,
      userId: userId,
      phoneCountry: otpRequest.phoneCountry,
      phoneNumber: otpRequest.phoneNumber,
      role: 'customer',
      type: 'access',
    };

    const refreshTokenPayload = {
      sub: userId,
      userId: userId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.config.jwtSecret,
      expiresIn: this.config.accessTokenExpiresInSec,
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.config.jwtSecret,
      expiresIn: this.config.refreshTokenExpiresInSec,
    });

    return {
      auth: {
        accessToken,
        expiresInSec: this.config.accessTokenExpiresInSec,
        refreshToken,
        refreshExpiresInSec: this.config.refreshTokenExpiresInSec,
      },
      user: {
        userId: userId,
        name: user.full_name || '',
        phone: {
          countryCode: otpRequest.phoneCountry,
          number: otpRequest.phoneNumber,
        },
        isNewUser,
      },
    };
  }
}
