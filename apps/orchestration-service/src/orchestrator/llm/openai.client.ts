import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '../../common/config/config.service';
import { LLMProvider, LLMMessage, LLMTool, StreamChunk, LLMConfig } from './provider.interface';

@Injectable()
export class OpenAIClient implements LLMProvider {
  name: 'openai' = 'openai';
  private client: OpenAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.openaiApiKey;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
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
      yield { type: 'error', error: 'OpenAI client not initialized' };
      return;
    }

    try {
      const { toolsForApi, nameMap } = this.buildToolMap(tools);
      const stream = await this.client.chat.completions.create({
        model: config.model || 'gpt-4',
        messages: messages as any,
        tools: toolsForApi.length > 0 ? toolsForApi : undefined,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
        stream: true,
      });

      // Accumulate tool call arguments across chunks
      const toolCallsMap = new Map<number, { name?: string; arguments: string }>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          yield { type: 'token', content: delta.content };
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index ?? 0;
            
            if (!toolCallsMap.has(index)) {
              toolCallsMap.set(index, { name: undefined, arguments: '' });
            }
            
            const accumulated = toolCallsMap.get(index)!;
            
            if (toolCall.function?.name) {
              accumulated.name = toolCall.function.name;
            }
            
            if (toolCall.function?.arguments) {
              accumulated.arguments += toolCall.function.arguments;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason === 'stop' || chunk.choices[0]?.finish_reason === 'tool_calls') {
          // Parse and yield all accumulated tool calls
          for (const [_, accumulated] of toolCallsMap) {
            if (accumulated.name) {
              try {
                const parsedArgs = JSON.parse(accumulated.arguments || '{}');
                yield {
                  type: 'tool_call',
                  toolCall: {
                    name: nameMap.get(accumulated.name) || accumulated.name,
                    arguments: parsedArgs,
                  },
                };
              } catch (parseError) {
                console.error('Failed to parse tool arguments:', accumulated.arguments);
                yield { type: 'error', error: `Invalid tool call arguments: ${parseError.message}` };
              }
            }
          }
          
          if (chunk.choices[0]?.finish_reason === 'stop') {
            yield { type: 'done' };
          }
        }
      }
    } catch (error) {
      console.error('OpenAI error:', error);
      yield { type: 'error', error: error.message };
    }
  }

  private convertTool(tool: LLMTool): any {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  private sanitizeToolName(name: string) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private buildToolMap(tools: LLMTool[]) {
    const nameMap = new Map<string, string>();
    const used = new Set<string>();
    const toolsForApi = tools.map(tool => {
      let sanitized = this.sanitizeToolName(tool.name);
      if (!sanitized) {
        sanitized = 'tool';
      }
      let candidate = sanitized;
      let counter = 1;
      while (used.has(candidate)) {
        counter += 1;
        candidate = `${sanitized}_${counter}`;
      }
      used.add(candidate);
      nameMap.set(candidate, tool.name);
      return this.convertTool({ ...tool, name: candidate });
    });
    return { toolsForApi, nameMap };
  }
}
