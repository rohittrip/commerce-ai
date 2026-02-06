import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private connected: boolean = false;
  private readonly keyPrefix: string;

  constructor(private config: ConfigService) {
    this.keyPrefix = this.config.redisKeyPrefix || '';
  }

  /** Prefix key so BFF and orchestration can share one Redis instance. */
  private prefixKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  async onModuleInit() {
    try {
      this.client = createClient({
        url: this.config.redisUrl,
      });

      this.client.on('error', (err) => console.error('Redis Client Error', err));
      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.connected = true;
      });
      this.client.on('disconnect', () => {
        console.log('Redis client disconnected');
        this.connected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      await this.client.quit();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Generic key-value operations (all keys are prefixed for multi-service isolation)
  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    const k = this.prefixKey(key);
    try {
      return await this.client.get(k);
    } catch (error) {
      console.error(`Redis GET error for key ${k}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.connected) return;
    const k = this.prefixKey(key);
    try {
      if (ttlSeconds) {
        await this.client.setEx(k, ttlSeconds, value);
      } else {
        await this.client.set(k, value);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${k}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    const k = this.prefixKey(key);
    try {
      await this.client.del(k);
    } catch (error) {
      console.error(`Redis DEL error for key ${k}:`, error);
    }
  }

  // List operations
  async lpush(key: string, value: string): Promise<void> {
    if (!this.connected) return;
    const k = this.prefixKey(key);
    try {
      await this.client.lPush(k, value);
    } catch (error) {
      console.error(`Redis LPUSH error for key ${k}:`, error);
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.connected) return [];
    const k = this.prefixKey(key);
    try {
      return await this.client.lRange(k, start, stop);
    } catch (error) {
      console.error(`Redis LRANGE error for key ${k}:`, error);
      return [];
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    if (!this.connected) return;
    const k = this.prefixKey(key);
    try {
      await this.client.lTrim(k, start, stop);
    } catch (error) {
      console.error(`Redis LTRIM error for key ${k}:`, error);
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.connected) return;
    const k = this.prefixKey(key);
    try {
      await this.client.hSet(k, field, value);
    } catch (error) {
      console.error(`Redis HSET error for key ${k}:`, error);
    }
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    if (!this.connected) return undefined;
    const k = this.prefixKey(key);
    try {
      return await this.client.hGet(k, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${k}:`, error);
      return undefined;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.connected) return {};
    const k = this.prefixKey(key);
    try {
      return await this.client.hGetAll(k);
    } catch (error) {
      console.error(`Redis HGETALL error for key ${k}:`, error);
      return {};
    }
  }

  // Expiry
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.connected) return;
    const k = this.prefixKey(key);
    try {
      await this.client.expire(k, seconds);
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${k}:`, error);
    }
  }

  // Session cache helpers
  async cacheSessionMessages(sessionId: string, messages: any[], ttlSeconds: number = 3600): Promise<void> {
    const key = `chat:session:${sessionId}:history`;
    await this.set(key, JSON.stringify(messages), ttlSeconds);
  }

  async getSessionMessages(sessionId: string): Promise<any[] | null> {
    const key = `chat:session:${sessionId}:history`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheSessionState(sessionId: string, state: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `chat:session:${sessionId}:state`;
    await this.set(key, JSON.stringify(state), ttlSeconds);
  }

  async getSessionState(sessionId: string): Promise<any | null> {
    const key = `chat:session:${sessionId}:state`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheTraceState(traceId: string, state: any, ttlSeconds: number = 600): Promise<void> {
    const key = `trace:${traceId}:state`;
    await this.set(key, JSON.stringify(state), ttlSeconds);
  }

  async getTraceState(traceId: string): Promise<any | null> {
    const key = `trace:${traceId}:state`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }
}
