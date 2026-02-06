import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class AddressFieldsDto {
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

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  country?: string;
}

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
