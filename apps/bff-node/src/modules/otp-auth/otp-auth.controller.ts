import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { OtpAuthService } from './otp-auth.service';
import {
  OtpRequestDto,
  OtpVerifyDto,
  OtpRequestResponseDto,
  OtpVerifyResponseDto,
} from './dto/otp-auth.dto';

@ApiTags('auth')
@Controller('v1/auth/otp')
export class OtpAuthController {
  constructor(private readonly otpAuthService: OtpAuthService) {}

  @Post('request')
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

  @Post('verify')
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
      res.cookie('auth_token', result.auth.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: result.auth.expiresInSec * 1000,
        path: '/',
      });

      // Also set refresh token cookie
      res.cookie('refresh_token', result.auth.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: result.auth.refreshExpiresInSec * 1000,
        path: '/',
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
