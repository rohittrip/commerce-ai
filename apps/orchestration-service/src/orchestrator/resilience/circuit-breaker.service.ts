import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { CircuitState, CircuitBreakerConfig } from '../../common/types';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure?: string;
  lastSuccess?: string;
  openedAt?: string;
  halfOpenAttempts: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 30000, // 30 seconds
    halfOpenRequests: 3,
  };

  private configs: Record<string, CircuitBreakerConfig> = {};
  private localState: Record<string, CircuitBreakerState> = {};

  constructor(private redis: RedisService) {}

  /**
   * Configure circuit breaker for a specific service/tool
   */
  configure(serviceName: string, config: Partial<CircuitBreakerConfig>): void {
    this.configs[serviceName] = {
      ...this.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Check if circuit is open (should not make request)
   */
  async isOpen(serviceName: string): Promise<boolean> {
    const state = await this.getState(serviceName);

    if (state.state === CircuitState.OPEN) {
      const config = this.getConfig(serviceName);
      const openedAt = state.openedAt ? new Date(state.openedAt).getTime() : 0;
      const now = Date.now();

      // Check if reset timeout has passed
      if (now - openedAt >= config.resetTimeoutMs) {
        await this.transitionToHalfOpen(serviceName);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Check if request should be allowed in half-open state
   */
  async shouldAllowRequest(serviceName: string): Promise<boolean> {
    const state = await this.getState(serviceName);

    if (state.state === CircuitState.CLOSED) {
      return true;
    }

    if (state.state === CircuitState.OPEN) {
      const isStillOpen = await this.isOpen(serviceName);
      return !isStillOpen;
    }

    if (state.state === CircuitState.HALF_OPEN) {
      const config = this.getConfig(serviceName);
      return state.halfOpenAttempts < config.halfOpenRequests;
    }

    return true;
  }

  /**
   * Record a successful request
   */
  async recordSuccess(serviceName: string): Promise<void> {
    const state = await this.getState(serviceName);

    if (state.state === CircuitState.HALF_OPEN) {
      state.halfOpenAttempts++;
      const config = this.getConfig(serviceName);

      // If enough successful requests in half-open, close circuit
      if (state.halfOpenAttempts >= config.halfOpenRequests) {
        state.state = CircuitState.CLOSED;
        state.failures = 0;
        state.halfOpenAttempts = 0;
        console.log(`[CircuitBreaker] ${serviceName} circuit CLOSED after recovery`);
      }
    } else {
      // Reset failure count on success
      state.failures = 0;
    }

    state.lastSuccess = new Date().toISOString();
    await this.saveState(serviceName, state);
  }

  /**
   * Record a failed request
   */
  async recordFailure(serviceName: string, error?: Error): Promise<void> {
    const state = await this.getState(serviceName);
    const config = this.getConfig(serviceName);

    state.failures++;
    state.lastFailure = new Date().toISOString();

    if (state.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state, go back to open
      state.state = CircuitState.OPEN;
      state.openedAt = new Date().toISOString();
      state.halfOpenAttempts = 0;
      console.log(`[CircuitBreaker] ${serviceName} circuit re-OPENED after half-open failure`);
    } else if (state.failures >= config.failureThreshold) {
      // Threshold reached, open circuit
      state.state = CircuitState.OPEN;
      state.openedAt = new Date().toISOString();
      console.log(`[CircuitBreaker] ${serviceName} circuit OPENED after ${state.failures} failures`);
    }

    await this.saveState(serviceName, state);
  }

  /**
   * Get current circuit state
   */
  async getCircuitState(serviceName: string): Promise<CircuitState> {
    const state = await this.getState(serviceName);
    return state.state;
  }

  /**
   * Force reset circuit to closed state
   */
  async reset(serviceName: string): Promise<void> {
    const state = this.createInitialState();
    await this.saveState(serviceName, state);
    console.log(`[CircuitBreaker] ${serviceName} circuit manually RESET`);
  }

  /**
   * Get health status of all circuits
   */
  async getHealthStatus(): Promise<Record<string, CircuitBreakerState>> {
    return { ...this.localState };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    // Check if circuit allows request
    const allowed = await this.shouldAllowRequest(serviceName);

    if (!allowed) {
      console.log(`[CircuitBreaker] ${serviceName} circuit is OPEN, request blocked`);

      if (fallback) {
        return fallback();
      }

      throw new Error(`Service ${serviceName} is temporarily unavailable (circuit open)`);
    }

    try {
      const result = await fn();
      await this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      await this.recordFailure(serviceName, error as Error);

      if (fallback) {
        return fallback();
      }

      throw error;
    }
  }

  // Private methods

  private async transitionToHalfOpen(serviceName: string): Promise<void> {
    const state = await this.getState(serviceName);
    state.state = CircuitState.HALF_OPEN;
    state.halfOpenAttempts = 0;
    await this.saveState(serviceName, state);
    console.log(`[CircuitBreaker] ${serviceName} circuit transitioned to HALF_OPEN`);
  }

  private async getState(serviceName: string): Promise<CircuitBreakerState> {
    // Try Redis first for distributed state
    const key = `circuit:${serviceName}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fall back to local state
    if (!this.localState[serviceName]) {
      this.localState[serviceName] = this.createInitialState();
    }

    return this.localState[serviceName];
  }

  private async saveState(serviceName: string, state: CircuitBreakerState): Promise<void> {
    this.localState[serviceName] = state;

    // Also persist to Redis for distributed state
    const key = `circuit:${serviceName}`;
    await this.redis.set(key, JSON.stringify(state), 300); // 5 min TTL
  }

  private getConfig(serviceName: string): CircuitBreakerConfig {
    return this.configs[serviceName] || this.DEFAULT_CONFIG;
  }

  private createInitialState(): CircuitBreakerState {
    return {
      state: CircuitState.CLOSED,
      failures: 0,
      halfOpenAttempts: 0,
    };
  }
}
