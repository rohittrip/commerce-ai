import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { UserContext } from '../../common/types';
import { LLMMessage } from '../llm/provider.interface';
import { AgentTask } from './base.agent';

/**
 * State of an individual agent
 */
export interface AgentState {
  agentName: string;
  currentTask?: AgentTask;
  lastResult?: any;
  workingMemory: Record<string, any>;  // Agent-specific temporary data
  startedAt?: string;
  completedAt?: string;
  status: 'idle' | 'working' | 'completed' | 'failed';
}

/**
 * Shared context across all agents for a session
 */
export interface SharedContext {
  sessionId: string;
  userId: string;
  conversationHistory: LLMMessage[];
  userContext: UserContext;
  taskGraph: Map<string, AgentTask>;       // All tasks in the current session
  agentStates: Map<string, AgentState>;    // State of each agent
  sharedMemory: Record<string, any>;       // Shared data accessible to all agents
  createdAt: string;
  updatedAt: string;
}

/**
 * Service to manage shared context across multiple agents
 * Uses Redis for coordination and state synchronization
 */
@Injectable()
export class SharedContextService {
  private readonly CONTEXT_TTL = 7200; // 2 hours
  private readonly LOCK_TTL = 10; // 10 seconds for optimistic locking

  constructor(private redis: RedisService) {}

  /**
   * Get or create shared context for a session
   * @param sessionId Session ID
   * @param userId User ID
   * @param userContext User context
   * @returns Shared context
   */
  async getOrCreateContext(
    sessionId: string,
    userId: string,
    userContext: UserContext,
  ): Promise<SharedContext> {
    const key = this.getContextKey(sessionId);
    const cached = await this.redis.get(key);

    if (cached) {
      return this.deserializeContext(JSON.parse(cached));
    }

    // Create new context
    const now = new Date().toISOString();
    const context: SharedContext = {
      sessionId,
      userId,
      conversationHistory: [],
      userContext,
      taskGraph: new Map(),
      agentStates: new Map(),
      sharedMemory: {},
      createdAt: now,
      updatedAt: now,
    };

    await this.saveContext(context);
    return context;
  }

  /**
   * Update shared context
   * Uses optimistic locking to prevent race conditions
   *
   * @param sessionId Session ID
   * @param updates Partial updates to apply
   * @returns Updated context
   */
  async updateContext(
    sessionId: string,
    updates: Partial<Omit<SharedContext, 'sessionId' | 'userId' | 'createdAt'>>,
  ): Promise<SharedContext> {
    const key = this.getContextKey(sessionId);
    const lockKey = `${key}:lock`;

    // Acquire lock
    const acquired = await this.acquireLock(lockKey);
    if (!acquired) {
      throw new Error('Failed to acquire lock for context update');
    }

    try {
      // Get current context
      const current = await this.getContext(sessionId);
      if (!current) {
        throw new Error(`Context not found for session ${sessionId}`);
      }

      // Apply updates
      const updated: SharedContext = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Save updated context
      await this.saveContext(updated);

      return updated;
    } finally {
      // Release lock
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Get shared context for a session
   * @param sessionId Session ID
   * @returns Shared context or null if not found
   */
  async getContext(sessionId: string): Promise<SharedContext | null> {
    const key = this.getContextKey(sessionId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    return this.deserializeContext(JSON.parse(cached));
  }

  /**
   * Add a task to the task graph
   * @param sessionId Session ID
   * @param task Task to add
   */
  async addTask(sessionId: string, task: AgentTask): Promise<void> {
    await this.updateContext(sessionId, {
      taskGraph: await this.getTaskGraph(sessionId).then(graph => {
        graph.set(task.id, task);
        return graph;
      }),
    });
  }

  /**
   * Get task graph for a session
   * @param sessionId Session ID
   * @returns Task graph
   */
  async getTaskGraph(sessionId: string): Promise<Map<string, AgentTask>> {
    const context = await this.getContext(sessionId);
    return context?.taskGraph || new Map();
  }

  /**
   * Get tasks that depend on a specific task
   * @param sessionId Session ID
   * @param taskId Task ID
   * @returns Array of dependent tasks
   */
  async getDependentTasks(sessionId: string, taskId: string): Promise<AgentTask[]> {
    const taskGraph = await this.getTaskGraph(sessionId);
    const dependentTasks: AgentTask[] = [];

    for (const task of taskGraph.values()) {
      if (task.dependencies?.includes(taskId)) {
        dependentTasks.push(task);
      }
    }

    return dependentTasks;
  }

  /**
   * Update agent state
   * @param sessionId Session ID
   * @param agentName Agent name
   * @param state Agent state updates
   */
  async updateAgentState(
    sessionId: string,
    agentName: string,
    state: Partial<AgentState>,
  ): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Context not found for session ${sessionId}`);
    }

    const currentState = context.agentStates.get(agentName) || {
      agentName,
      status: 'idle' as const,
      workingMemory: {},
    };

    const updatedState: AgentState = {
      ...currentState,
      ...state,
      agentName, // Ensure agent name doesn't change
    };

    context.agentStates.set(agentName, updatedState);

    await this.updateContext(sessionId, {
      agentStates: context.agentStates,
    });
  }

  /**
   * Get state of a specific agent
   * @param sessionId Session ID
   * @param agentName Agent name
   * @returns Agent state or null if not found
   */
  async getAgentState(
    sessionId: string,
    agentName: string,
  ): Promise<AgentState | null> {
    const context = await this.getContext(sessionId);
    if (!context) {
      return null;
    }

    return context.agentStates.get(agentName) || null;
  }

  /**
   * Add a message to conversation history
   * @param sessionId Session ID
   * @param message Message to add
   */
  async addMessage(sessionId: string, message: LLMMessage): Promise<void> {
    const context = await this.getContext(sessionId);
    if (!context) {
      throw new Error(`Context not found for session ${sessionId}`);
    }

    context.conversationHistory.push(message);

    await this.updateContext(sessionId, {
      conversationHistory: context.conversationHistory,
    });
  }

  /**
   * Get or set shared memory value
   * @param sessionId Session ID
   * @param key Memory key
   * @param value Value to set (if undefined, just gets the value)
   * @returns Current value
   */
  async sharedMemory<T = any>(
    sessionId: string,
    key: string,
    value?: T,
  ): Promise<T | undefined> {
    const context = await this.getContext(sessionId);
    if (!context) {
      return undefined;
    }

    if (value !== undefined) {
      // Set value
      context.sharedMemory[key] = value;
      await this.updateContext(sessionId, {
        sharedMemory: context.sharedMemory,
      });
      return value;
    }

    // Get value
    return context.sharedMemory[key] as T;
  }

  /**
   * Clear shared context for a session
   * @param sessionId Session ID
   */
  async clearContext(sessionId: string): Promise<void> {
    const key = this.getContextKey(sessionId);
    await this.redis.del(key);
  }

  // Private helper methods

  private getContextKey(sessionId: string): string {
    return `agent:shared:context:${sessionId}`;
  }

  private async saveContext(context: SharedContext): Promise<void> {
    const key = this.getContextKey(context.sessionId);
    const serialized = this.serializeContext(context);
    await this.redis.set(key, JSON.stringify(serialized), this.CONTEXT_TTL);
  }

  /**
   * Serialize context for Redis storage
   * Converts Maps to arrays for JSON serialization
   */
  private serializeContext(context: SharedContext): any {
    return {
      ...context,
      taskGraph: Array.from(context.taskGraph.entries()),
      agentStates: Array.from(context.agentStates.entries()),
    };
  }

  /**
   * Deserialize context from Redis
   * Converts arrays back to Maps
   */
  private deserializeContext(data: any): SharedContext {
    return {
      ...data,
      taskGraph: new Map(data.taskGraph || []),
      agentStates: new Map(data.agentStates || []),
    };
  }

  /**
   * Acquire optimistic lock
   * @param key Lock key
   * @returns true if lock acquired, false otherwise
   */
  private async acquireLock(key: string): Promise<boolean> {
    try {
      // Check if lock exists
      const exists = await this.redis.get(key);
      if (exists) {
        return false; // Lock already held
      }

      // Set lock with TTL
      await this.redis.set(key, '1', this.LOCK_TTL);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Release optimistic lock
   * @param key Lock key
   */
  private async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
