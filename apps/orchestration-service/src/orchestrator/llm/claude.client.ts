import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '../../common/config/config.service';
import { LLMProvider, LLMMessage, LLMTool, StreamChunk, LLMConfig } from './provider.interface';

@Injectable()
export class ClaudeClient implements LLMProvider {
  name: 'claude' = 'claude';
  private client: any = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.anthropicApiKey;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async *generateResponse(
    messages: LLMMessage[],
    tools: LLMTool[],
    config: LLMConfig,
  ): AsyncGenerator<StreamChunk> {
    if (!this.client) {
      yield { type: 'error', error: 'Claude client not initialized' };
      return;
    }

    try {
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const stream = this.client.messages.stream({
        model: config.model || 'claude-3-sonnet-20240229',
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature || 0.7,
        system: systemMessage,
        messages: conversationMessages as any,
        tools: tools.length > 0 ? tools.map(this.convertTool) : undefined,
      });

      const toolCallsMap = new Map<number, { name?: string; input: any }>();

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_start') {
          const content = (chunk as any).content_block;
          if (content?.type === 'tool_use') {
            const index = (chunk as any).index ?? 0;
            toolCallsMap.set(index, { name: content.name, input: {} });
          }
        }

        if (chunk.type === 'content_block_delta') {
          const delta = (chunk as any).delta;
          
          if (delta?.type === 'text_delta' && delta.text) {
            yield { type: 'token', content: delta.text };
          }
          
          if (delta?.type === 'input_json_delta') {
            const index = (chunk as any).index ?? 0;
            const accumulated = toolCallsMap.get(index);
            if (accumulated && delta.partial_json) {
              // Accumulate the partial JSON string
              if (!accumulated.input._partial) {
                accumulated.input._partial = '';
              }
              accumulated.input._partial += delta.partial_json;
            }
          }
        }

        if (chunk.type === 'message_stop') {
          // Parse and yield all accumulated tool calls
          for (const [_, accumulated] of toolCallsMap) {
            if (accumulated.name && accumulated.input._partial) {
              try {
                const parsedInput = JSON.parse(accumulated.input._partial);
                yield {
                  type: 'tool_call',
                  toolCall: {
                    name: accumulated.name,
                    arguments: parsedInput,
                  },
                };
              } catch (parseError) {
                console.error('Failed to parse Claude tool input:', accumulated.input._partial);
                yield { type: 'error', error: `Invalid tool call arguments: ${parseError.message}` };
              }
            }
          }
          
          yield { type: 'done' };
        }
      }
    } catch (error) {
      console.error('Claude error:', error);
      yield { type: 'error', error: error.message };
    }
  }

  private convertTool(tool: LLMTool): any {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    };
  }
}
