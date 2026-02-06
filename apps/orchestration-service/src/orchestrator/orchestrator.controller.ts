import { Controller, Post, Body, Sse, MessageEvent } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { Observable } from 'rxjs';

@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('process')
  @Sse('process-stream')
  processMessage(
    @Body() body: { sessionId: string; userId: string; message: string },
  ): Observable<MessageEvent> {
    const { sessionId, userId, message } = body;
    
    return new Observable((subscriber) => {
      (async () => {
        try {
          const stream = this.orchestratorService.processMessage(sessionId, userId, message);
          for await (const chunk of stream) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  @Post('test-tool')
  async testTool(
    @Body() body: { toolName: string; arguments: any; traceId?: string },
  ) {
    const { toolName, arguments: args, traceId } = body;
    return this.orchestratorService['mcpClient'].executeTool(toolName, args, traceId);
  }
}
