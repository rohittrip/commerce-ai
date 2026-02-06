import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { OpenAIClient } from './openai.client';
import { ClaudeClient } from './claude.client';
import { GeminiClient } from './gemini.client';
import { LLMProvider, LLMMessage, LLMTool, StreamChunk, LLMConfig } from './provider.interface';

@Injectable()
export class LLMRouter implements OnModuleInit {
  private providers: Map<string, LLMProvider> = new Map();
  private primaryProvider: string = 'openai';
  private fallbackProvider: string = 'claude';

  constructor(
    private db: DatabaseService,
    private openai: OpenAIClient,
    private claude: ClaudeClient,
    private gemini: GeminiClient,
  ) {
    this.providers.set('openai', openai);
    this.providers.set('claude', claude);
    this.providers.set('gemini', gemini);
  }

  async onModuleInit() {
    await this.loadConfig();
  }

  private async loadConfig() {
    try {
      const primary = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'llm.provider.primary'"
      );
      if (primary?.value?.provider) {
        this.primaryProvider = primary.value.provider;
      }

      const fallback = await this.db.queryOne<any>(
        "SELECT value FROM admin_configs WHERE key = 'llm.provider.fallback'"
      );
      if (fallback?.value?.provider) {
        this.fallbackProvider = fallback.value.provider;
      }
    } catch (error) {
      console.warn('Failed to load LLM config from DB, using defaults');
    }
  }

  async *generateResponse(
    messages: LLMMessage[],
    tools: LLMTool[],
    config?: LLMConfig,
  ): AsyncGenerator<StreamChunk> {
    // Try primary provider
    const primary = this.providers.get(this.primaryProvider);
    if (primary && primary.isAvailable()) {
      console.log(`Using primary LLM provider: ${this.primaryProvider}`);
      try {
        yield* primary.generateResponse(messages, tools, config || {});
        return;
      } catch (error) {
        console.error(`Primary provider ${this.primaryProvider} failed:`, error);
      }
    }

    // Try fallback provider
    const fallback = this.providers.get(this.fallbackProvider);
    if (fallback && fallback.isAvailable()) {
      console.log(`Using fallback LLM provider: ${this.fallbackProvider}`);
      try {
        yield* fallback.generateResponse(messages, tools, config || {});
        return;
      } catch (error) {
        console.error(`Fallback provider ${this.fallbackProvider} failed:`, error);
      }
    }

    // Try any available provider
    for (const [name, provider] of this.providers.entries()) {
      if (provider.isAvailable()) {
        console.log(`Using alternative LLM provider: ${name}`);
        try {
          yield* provider.generateResponse(messages, tools, config || {});
          return;
        } catch (error) {
          console.error(`Provider ${name} failed:`, error);
        }
      }
    }

    yield { type: 'error', error: 'No LLM providers available' };
  }

  async setPrimaryProvider(provider: string) {
    if (this.providers.has(provider)) {
      this.primaryProvider = provider;
      await this.db.query(
        `INSERT INTO admin_configs (key, category, value) 
         VALUES ('llm.provider.primary', 'llm', $1::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
        [JSON.stringify({ provider })]
      );
    }
  }
}
