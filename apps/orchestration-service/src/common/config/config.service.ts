import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get<T = string>(key: string, defaultValue?: T): T {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue as T;
    }
    return value as T;
  }

  get databaseUrl(): string {
    // Use NODE_DATABASE_URL for Node.js BFF (PostgreSQL connection string format)
    return this.get('NODE_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/commerce_ai');
  }

  get redisUrl(): string {
    return this.get('REDIS_URL', 'redis://localhost:6379');
  }

  /** Prefix for all Redis keys so BFF and orchestration can share one Redis without collisions. */
  get redisKeyPrefix(): string {
    return this.get('REDIS_KEY_PREFIX', 'orch');
  }

  get jwtSecret(): string {
    return this.get('JWT_SECRET', 'commerce-ai-secret-key-change-in-production');
  }

  get jwtExpiresIn(): string {
    return this.get('JWT_EXPIRES_IN', '7d');
  }

  get mcpToolServerUrl(): string {
    return this.get('MCP_TOOL_SERVER_URL', 'http://localhost:8081');
  }

  get openaiApiKey(): string {
    return this.get('OPENAI_API_KEY', '');
  }

  get anthropicApiKey(): string {
    return this.get('ANTHROPIC_API_KEY', '');
  }

  get googleApiKey(): string {
    return this.get('GOOGLE_API_KEY', '');
  }

  get port(): number {
    return parseInt(this.get('PORT', '3000'), 10);
  }

  get debugMode(): boolean {
    return this.get('DEBUG_MODE', 'false').toLowerCase() === 'true';
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV', 'development');
  }

  /** Optional MongoDB (e.g. for sessions); use separate collection/database per service. */
  get mongodbUri(): string | undefined {
    return this.get<string>('MONGODB_URI');
  }
}
