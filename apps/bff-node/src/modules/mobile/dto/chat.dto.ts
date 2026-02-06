import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Show me laptops under 50k' })
  @IsString()
  message: string;
}
