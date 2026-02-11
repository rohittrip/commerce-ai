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
    return this.get('REDIS_KEY_PREFIX', 'bff');
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

  /** MongoDB for mobile flow (sessions, chat, cart, addresses). */
  get mongodbUri(): string {
    return this.get('MONGODB_URI', 'mongodb://localhost:27017/commerce_ai_bff');
  }

  /** Orchestrator HTTP URL (used when gRPC is not set). */
  get orchestratorUrl(): string {
    return this.get('ORCHESTRATOR_URL', 'http://localhost:3001');
  }

  /** Orchestrator gRPC URL (e.g. localhost:50051). When set, BFF uses gRPC instead of HTTP. */
  get orchestratorGrpcUrl(): string | undefined {
    return this.get<string>('ORCHESTRATOR_GRPC_URL') || undefined;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // OTP Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  /** OTP expiry time in seconds (default: 120 = 2 minutes) */
  get otpExpiresInSec(): number {
    return parseInt(this.get('OTP_EXPIRES_IN_SEC', '120'), 10);
  }

  /** OTP resend available time in seconds (default: 30 seconds) */
  get otpResendAvailableInSec(): number {
    return parseInt(this.get('OTP_RESEND_AVAILABLE_IN_SEC', '30'), 10);
  }

  /** Access token expiry in seconds (default: 3600 = 1 hour) */
  get accessTokenExpiresInSec(): number {
    return parseInt(this.get('ACCESS_TOKEN_EXPIRES_IN_SEC', '3600'), 10);
  }

  /** Refresh token expiry in seconds (default: 2592000 = 30 days) */
  get refreshTokenExpiresInSec(): number {
    return parseInt(this.get('REFRESH_TOKEN_EXPIRES_IN_SEC', '2592000'), 10);
  }

  /** Dummy OTP for testing (default: 1234) */
  get dummyOtp(): string {
    return this.get('DUMMY_OTP', '1234');
  }
}
