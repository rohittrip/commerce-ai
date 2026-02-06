import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { OrchestratorService } from './orchestrator.service';

/** Request/response types matching proto commerce.ai.orchestrator */
export interface ProcessMessageRequest {
  session_id: string;
  user_id: string;
  message: string;
  trace_id?: string;
}

export interface ProcessChunk {
  json: string;
}

export interface TestToolRequest {
  tool_name: string;
  arguments_json: string;
  trace_id?: string;
}

export interface TestToolResponse {
  success: boolean;
  result_json: string;
  error?: string;
}

@Controller()
export class OrchestratorGrpcController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @GrpcMethod('Orchestrator', 'ProcessMessage')
  processMessage(data: ProcessMessageRequest): Observable<ProcessChunk> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          for await (const chunk of this.orchestratorService.processMessage(
            data.session_id,
            data.user_id,
            data.message,
            { traceId: data.trace_id },
          )) {
            subscriber.next({ json: JSON.stringify(chunk) });
          }
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  @GrpcMethod('Orchestrator', 'TestTool')
  async testTool(data: TestToolRequest): Promise<TestToolResponse> {
    try {
      const args = data.arguments_json ? JSON.parse(data.arguments_json) : {};
      const result = await (this.orchestratorService as any).mcpClient.executeTool(
        data.tool_name,
        args,
        data.trace_id,
      );
      return { success: true, result_json: JSON.stringify(result ?? {}) };
    } catch (err: any) {
      return {
        success: false,
        result_json: '',
        error: err?.message ?? String(err),
      };
    }
  }
}
