import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────────────────────────────
// Nested Objects
// ─────────────────────────────────────────────────────────────────────────────

export class PhoneDto {
  @ApiProperty({ example: '+91', description: 'Country code' })
  @IsString()
  @MaxLength(8)
  countryCode: string;

  @ApiProperty({ example: '7626372817', description: 'Phone number' })
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  number: string;
}

export class DeviceDto {
  @ApiProperty({ example: 'abc', description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ example: 'ios', enum: ['ios', 'android', 'web'] })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: '1.2.3', description: 'App version' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class OtpRequestDto {
  @ApiProperty({ type: PhoneDto })
  @ValidateNested()
  @Type(() => PhoneDto)
  phone: PhoneDto;

  @ApiProperty({
    example: 'sms',
    enum: ['sms', 'whatsapp', 'email'],
    description: 'OTP delivery channel',
  })
  @IsEnum(['sms', 'whatsapp', 'email'])
  channel: string;

  @ApiProperty({
    example: 'LOGIN',
    enum: ['LOGIN', 'SIGNUP', 'RESET_PASSWORD', 'VERIFY_PHONE'],
    description: 'Purpose of OTP',
  })
  @IsEnum(['LOGIN', 'SIGNUP', 'RESET_PASSWORD', 'VERIFY_PHONE'])
  purpose: string;

  @ApiProperty({ type: DeviceDto })
  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class OtpVerifyDto {
  @ApiProperty({ example: 'otpreq_123', description: 'OTP request ID from /request endpoint' })
  @IsString()
  @IsNotEmpty()
  otpRequestId: string;

  @ApiProperty({ example: '1234', description: 'OTP code (use 1234 for testing)' })
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  otp: string;

  @ApiProperty({ type: DeviceDto })
  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class OtpRequestResponseDataDto {
  @ApiProperty({ example: 'otpreq_123' })
  otpRequestId: string;

  @ApiProperty({ example: 120, description: 'OTP expiry time in seconds' })
  expiresInSec: number;

  @ApiProperty({ example: 30, description: 'Time until resend is available in seconds' })
  resendAvailableInSec: number;
}

export class MetaDto {
  @ApiProperty({ example: 'req_abc123', description: 'Request ID for tracing' })
  requestId: string;
}

export class OtpRequestResponseDto {
  @ApiProperty({ type: OtpRequestResponseDataDto })
  data: OtpRequestResponseDataDto;

  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiPropertyOptional({ nullable: true })
  error: string | null;
}

export class AuthTokensDto {
  @ApiProperty({ example: 'jwt_access_...' })
  accessToken: string;

  @ApiProperty({ example: 3600 })
  expiresInSec: number;

  @ApiProperty({ example: 'jwt_refresh_...' })
  refreshToken: string;

  @ApiProperty({ example: 2592000 })
  refreshExpiresInSec: number;
}

export class UserResponseDto {
  @ApiProperty({ example: 'u_001' })
  userId: string;

  @ApiProperty({ example: 'Rajveer' })
  name: string;

  @ApiProperty({ type: PhoneDto })
  phone: PhoneDto;

  @ApiProperty({ example: false })
  isNewUser: boolean;
}

export class OtpVerifyResponseDataDto {
  @ApiProperty({ type: AuthTokensDto })
  auth: AuthTokensDto;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class OtpVerifyResponseDto {
  @ApiProperty({ type: OtpVerifyResponseDataDto })
  data: OtpVerifyResponseDataDto;

  @ApiPropertyOptional({ type: MetaDto })
  meta?: MetaDto;

  @ApiPropertyOptional({ nullable: true })
  error?: string | null;
}
