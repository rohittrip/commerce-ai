import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class GenerateOtpDto {
  @ApiProperty({ example: '+91', description: 'Phone country code' })
  @IsString()
  @MaxLength(8)
  phoneCountry: string;

  @ApiProperty({ example: '9876543210', description: 'Phone number' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phoneNumber: string;
}

export class ValidateOtpDto {
  @ApiProperty({ example: '+91', description: 'Phone country code' })
  @IsString()
  @MaxLength(8)
  phoneCountry: string;

  @ApiProperty({ example: '9876543210', description: 'Phone number' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '3210', description: 'OTP: mock accepts last 4 digits of phone number or 1234 for testing' })
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  otp: string;

  @ApiPropertyOptional({ description: 'Guest ID from anonymous chat; sessions with this ID will become user sessions after login' })
  @IsOptional()
  @IsString()
  guest_id?: string;
}
