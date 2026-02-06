import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class CartItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  qty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SaveCartDto {
  @ApiProperty({ type: [CartItemDto] })
  items: CartItemDto[];
}
