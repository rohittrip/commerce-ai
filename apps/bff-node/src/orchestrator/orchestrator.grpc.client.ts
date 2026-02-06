import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.join(__dirname, '..', '..', 'proto', 'orchestrator.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;
const OrchestratorService = proto.commerce?.ai?.orchestrator?.Orchestrator;

if (!OrchestratorService) {
  throw new Error('Orchestrator gRPC service not found in proto. Check package name.');
}

/**
 * gRPC client for the Orchestration service.
 * Use when ORCHESTRATOR_GRPC_URL is set (e.g. when BFF and Orchestrator are separate).
 */
export class OrchestratorGrpcClient {
  private client: any;

  constructor(url: string, options?: { insecure?: boolean }) {
    const creds =
      options?.insecure !== false
        ? grpc.credentials.createInsecure()
        : grpc.credentials.createSsl();
    this.client = new OrchestratorService(url, creds);
  }

  /**
   * Server-streaming: process message and yield each chunk as async generator.
   */
  async *processMessage(
    sessionId: string,
    userId: string,
    message: string,
  ): AsyncGenerator<any> {
    const queue: any[] = [];
    let streamEnded = false;
    let streamError: Error | null = null;

    const call = this.client.ProcessMessage({
      session_id: sessionId,
      user_id: userId,
      message,
    });

    call.on('data', (chunk: { json?: string }) => {
      try {
        const data = chunk.json ? JSON.parse(chunk.json) : chunk;
        queue.push(data);
      } catch (_) {
        queue.push(chunk);
      }
    });
    call.on('end', () => {
      streamEnded = true;
    });
    call.on('error', (err: Error) => {
      streamError = err;
      streamEnded = true;
    });

    while (!streamEnded || queue.length > 0) {
      if (streamError) throw streamError;
      if (queue.length > 0) {
        yield queue.shift();
      } else {
        await new Promise<void>((r) => setTimeout(r, 10));
      }
    }
  }

  /**
   * Unary: execute a tool (e.g. test-tool).
   */
  testTool(toolName: string, args: Record<string, unknown>, traceId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.TestTool(
        {
          tool_name: toolName,
          arguments_json: JSON.stringify(args ?? {}),
          trace_id: traceId,
        },
        (err: Error | null, res: { success?: boolean; result_json?: string; error?: string }) => {
          if (err) {
            reject(err);
            return;
          }
          if (res && !res.success && res.error) {
            reject(new Error(res.error));
            return;
          }
          try {
            const result = res?.result_json ? JSON.parse(res.result_json) : res;
            resolve(result);
          } catch (_) {
            resolve(res);
          }
        }
      );
    });
  }
}
