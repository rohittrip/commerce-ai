import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@Controller('v1/events')
export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  @Post()
  @ApiOperation({ summary: 'Record telemetry event' })
  async recordEvent(@Body() event: any) {
    return this.telemetryService.recordEvent(event);
  }
}
