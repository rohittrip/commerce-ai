import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '../../common/config/config.service';
import { LLMProvider, LLMMessage, LLMTool, StreamChunk, LLMConfig } from './provider.interface';

@Injectable()
export class GeminiClient implements LLMProvider {
  name: 'gemini' = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.googleApiKey;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
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
      yield { type: 'error', error: 'Gemini client not initialized' };
      return;
    }

    try {
      const model = this.client.getGenerativeModel({
        model: config.model || 'gemini-pro',
      });

      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { type: 'token', content: text };
        }
      }

      yield { type: 'done' };
    } catch (error) {
      console.error('Gemini error:', error);
      yield { type: 'error', error: error.message };
    }
  }
}
