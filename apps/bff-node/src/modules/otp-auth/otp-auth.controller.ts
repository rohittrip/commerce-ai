import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpException,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { OtpAuthService } from './otp-auth.service';
import {
  OtpRequestDto,
  OtpVerifyDto,
  OtpRequestResponseDto,
  OtpVerifyResponseDto,
  AuthMeResponseDto,
} from './dto/otp-auth.dto';

@ApiTags('auth')
@Controller('v1/auth')
export class OtpAuthController {
  constructor(private readonly otpAuthService: OtpAuthService) {}

  @Get('me')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get current user',
    description: 'Validate auth cookie and return current user info. Returns 401 if cookie is invalid or missing.',
  })
  @ApiResponse({
    status: 200,
    description: 'User info retrieved successfully',
    type: AuthMeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing auth cookie' })
  async getMe(@Req() req: Request): Promise<AuthMeResponseDto> {
    const requestId = `req_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    // Debug: log cookies received
    console.log('[/v1/auth/me] Cookies received:', req.cookies);
    console.log('[/v1/auth/me] Cookie header:', req.headers.cookie);

    // Get auth token from cookie OR from Authorization header (fallback)
    let authToken = req.cookies?.auth_token;
    
    // Fallback: check Authorization header (Bearer token)
    if (!authToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
        console.log('[/v1/auth/me] Using token from Authorization header');
      }
    }

    if (!authToken) {
      console.log('[/v1/auth/me] No auth token found');
      throw new HttpException(
        {
          data: null,
          meta: { requestId },
          error: 'Authentication required',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    
    console.log('[/v1/auth/me] Auth token found, validating...');

    // Validate token and get user info
    const result = await this.otpAuthService.validateToken(authToken);

    if (!result) {
      throw new HttpException(
        {
          data: null,
          meta: { requestId },
          error: 'Invalid or expired token',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      data: {
        user: result.user,
      },
      meta: { requestId },
      error: null,
    };
  }

  @Post('otp/request')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Request OTP',
    description: 'Send OTP to phone number. Use OTP "1234" or last 4 digits of phone for testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: OtpRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async requestOtp(@Body() dto: OtpRequestDto): Promise<OtpRequestResponseDto> {
    const requestId = `req_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    try {
      const result = await this.otpAuthService.requestOtp({
        phone: {
          countryCode: dto.phone.countryCode,
          number: dto.phone.number,
        },
        channel: dto.channel,
        purpose: dto.purpose,
        device: {
          deviceId: dto.device.deviceId,
          platform: dto.device.platform,
          appVersion: dto.device.appVersion,
        },
      });

      return {
        data: {
          otpRequestId: result.otpRequestId,
          expiresInSec: result.expiresInSec,
          resendAvailableInSec: result.resendAvailableInSec,
        },
        meta: { requestId },
        error: null,
      };
    } catch (error) {
      throw new HttpException(
        {
          data: null,
          meta: { requestId },
          error: error instanceof Error ? error.message : 'Failed to send OTP',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Validate OTP and get auth tokens. Use OTP "1234" or last 4 digits of phone for testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, returns auth tokens and user info',
    type: OtpVerifyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or request' })
  async verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OtpVerifyResponseDto> {
    const requestId = `req_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    try {
      const result = await this.otpAuthService.verifyOtp({
        otpRequestId: dto.otpRequestId,
        otp: dto.otp,
        device: {
          deviceId: dto.device.deviceId,
        },
      });

      // Set JWT in HTTP-only cookie
      // Use sameSite: 'none' for cross-origin (ngrok, etc.) - requires secure: true
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: true, // Required for sameSite: 'none'
        sameSite: 'none' as const, // Allow cross-origin cookies
        path: '/',
      };

      res.cookie('auth_token', result.auth.accessToken, {
        ...cookieOptions,
        maxAge: result.auth.expiresInSec * 1000,
      });

      // Also set refresh token cookie
      res.cookie('refresh_token', result.auth.refreshToken, {
        ...cookieOptions,
        maxAge: result.auth.refreshExpiresInSec * 1000,
      });

      // Don't return tokens in response body - they are set in HTTP-only cookies
      return {
        data: {
          user: result.user,
        },
        meta: { requestId },
        error: null,
      };
    } catch (error) {
      throw new HttpException(
        {
          data: null,
          meta: { requestId },
          error: error instanceof Error ? error.message : 'OTP verification failed',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
