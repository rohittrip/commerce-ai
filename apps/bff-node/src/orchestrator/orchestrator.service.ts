import { Injectable } from '@nestjs/common';
import { ConfigService } from '../common/config/config.service';
import { OrchestratorGrpcClient } from './orchestrator.grpc.client';
import axios from 'axios';

@Injectable()
export class OrchestratorService {
  private readonly httpUrl: string;
  private readonly grpcUrl: string | undefined;
  private grpcClient: OrchestratorGrpcClient | null = null;

  constructor(private config: ConfigService) {
    this.httpUrl = this.config.orchestratorUrl;
    this.grpcUrl = this.config.orchestratorGrpcUrl;
  }

  private getGrpcClient(): OrchestratorGrpcClient {
    if (!this.grpcUrl) throw new Error('ORCHESTRATOR_GRPC_URL is not set');
    if (!this.grpcClient) {
      this.grpcClient = new OrchestratorGrpcClient(this.grpcUrl);
    }
    return this.grpcClient;
  }

  private useGrpc(): boolean {
    return Boolean(this.grpcUrl);
  }

  async *processMessage(
    sessionId: string,
    userId: string,
    userMessage: string,
  ): AsyncGenerator<any> {
    if (this.useGrpc()) {
      yield* this.getGrpcClient().processMessage(sessionId, userId, userMessage);
      return;
    }

    try {
      const response = await axios.post(
        `${this.httpUrl}/orchestrator/process`,
        { sessionId, userId, message: userMessage },
        { responseType: 'stream' }
      );

      for await (const chunk of response.data as AsyncIterable<Buffer>) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              yield data;
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to communicate with Orchestration Service:', error);
      yield { type: 'error', error: 'Orchestration service unavailable' };
      yield { type: 'done' };
    }
  }

  /**
   * Execute a tool (e.g. from admin test-tool). Uses gRPC when ORCHESTRATOR_GRPC_URL is set.
   */
  async testTool(
    toolName: string,
    args: Record<string, unknown>,
    traceId?: string,
  ): Promise<any> {
    if (this.useGrpc()) {
      return this.getGrpcClient().testTool(toolName, args, traceId);
    }

    const response = await axios.post(`${this.httpUrl}/orchestrator/test-tool`, {
      toolName,
      arguments: args,
      traceId,
    });
    return response.data;
  }
}
