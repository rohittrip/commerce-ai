import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

// Address types enum
export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}

export class AddressFieldsDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'MH' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  country?: string;
}

// DTO for adding a new address
export class AddAddressDto {
  @ApiProperty({ enum: AddressType, example: 'home' })
  @IsEnum(AddressType)
  type: AddressType;

  @ApiPropertyOptional({ example: "Mom's House" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: AddressFieldsDto })
  address: AddressFieldsDto;
}

// DTO for updating an address
export class UpdateAddressDto {
  @ApiPropertyOptional({ enum: AddressType })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ type: AddressFieldsDto })
  @IsOptional()
  address?: AddressFieldsDto;
}

// Legacy DTO - kept for backward compatibility
export class SaveAddressDto {
  @ApiProperty({ type: AddressFieldsDto })
  shipping: AddressFieldsDto;

  @ApiPropertyOptional({ type: AddressFieldsDto, description: 'Omit if billingSameAsShipping is true' })
  @IsOptional()
  billing?: AddressFieldsDto;

  @ApiPropertyOptional({ default: true, description: 'If true, billing = shipping' })
  @IsOptional()
  @IsBoolean()
  billingSameAsShipping?: boolean;
}
