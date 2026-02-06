import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class GenerateOtpDto {
  @ApiProperty({ example: '9876543210', description: 'Mobile number' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  mobile: string;
}

export class ValidateOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  mobile: string;

  @ApiProperty({ example: '3210', description: 'OTP: mock accepts last 4 digits of mobile or 1234 for testing' })
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  otp: string;

  @ApiProperty({ required: false, description: 'Guest ID from anonymous chat; sessions with this ID will become user sessions after login' })
  @IsOptional()
  @IsString()
  guest_id?: string;
}
