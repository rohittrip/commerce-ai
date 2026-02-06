import { Intent, UserContext, ToolError } from '../../common/types';
import { StreamChunk } from '../llm/provider.interface';

/**
 * Agent capabilities define what each agent can handle
 */
export enum AgentCapability {
  SEARCH = 'SEARCH',               // Product search and discovery
  COMPARE = 'COMPARE',              // Product comparison
  CART = 'CART',                    // Cart management
  CHECKOUT = 'CHECKOUT',            // Checkout and order processing
  SUPPORT = 'SUPPORT',              // Customer support, order tracking
  REASONING = 'REASONING',          // Complex decision making, chain-of-thought
  ANALYTICS = 'ANALYTICS',          // User behavior tracking and analysis
  GENERAL_CHAT = 'GENERAL_CHAT',    // General conversation handling
}

/**
 * Task that can be assigned to an agent
 */
export interface AgentTask {
  id: string;
  type: string;                      // Task type (e.g., 'PRODUCT_SEARCH', 'ADD_TO_CART')
  intent: Intent;                    // Original user intent
  context: UserContext;              // User context and session state
  parameters: Record<string, any>;   // Task-specific parameters
  priority: number;                  // Task priority (higher = more urgent)
  parentTaskId?: string;             // Parent task ID if this is a subtask
  dependencies?: string[];           // Task IDs this task depends on
  metadata?: {
    callChain?: string[];            // Agent call chain to prevent circular dependencies
    depth?: number;                  // Task depth in dependency graph
    traceId?: string;                // Trace ID for debugging
  };
}

/**
 * Response from an agent after executing a task
 */
export interface AgentResponse {
  taskId: string;
  agentName: string;
  status: 'success' | 'failure' | 'partial';
  data?: any;
  error?: ToolError;
  metadata?: {
    duration: number;                // Execution time in ms
    toolsCalled: string[];           // Tools called during execution
    confidence: number;              // Confidence in the result (0-1)
  };
  subTasks?: AgentTask[];            // Subtasks spawned by this agent
}

/**
 * Base abstract class for all agents in the multi-agent system
 *
 * Each agent specializes in handling specific intents and capabilities.
 * Agents can delegate tasks to other agents and execute tools via MCP client.
 */
export abstract class BaseAgent {
  /**
   * Unique name of the agent (e.g., 'LeaderAgent', 'ProductBrowsingAgent')
   */
  abstract readonly name: string;

  /**
   * Capabilities this agent can handle
   */
  abstract readonly capabilities: AgentCapability[];

  /**
   * Priority of this agent (higher = preferred when multiple agents can handle a task)
   */
  abstract readonly priority: number;

  /**
   * Maximum task depth to prevent infinite recursion
   */
  protected readonly maxTaskDepth: number = 5;

  /**
   * Agents this agent is allowed to delegate to (prevents circular dependencies)
   */
  protected readonly allowedDelegations: string[] = [];

  /**
   * Maximum number of delegations this agent can make per task
   */
  protected readonly maxDelegations: number = 3;

  /**
   * Check if this agent can handle a given task
   * @param task The task to check
   * @returns true if this agent can handle the task
   */
  abstract canHandle(task: AgentTask): boolean;

  /**
   * Execute a task and stream results
   * @param task The task to execute
   * @yields StreamChunk results as they are generated
   */
  abstract execute(task: AgentTask): AsyncGenerator<StreamChunk>;

  /**
   * Delegate a task to another agent
   * Subclasses can override to customize delegation behavior
   *
   * @param agentName Name of the agent to delegate to
   * @param task Task to delegate
   * @throws Error if delegation is not allowed or exceeds limits
   */
  protected async delegateToAgent(
    agentName: string,
    task: AgentTask,
  ): Promise<AgentResponse> {
    // Check if delegation is allowed
    if (!this.allowedDelegations.includes(agentName)) {
      throw new Error(
        `Agent ${this.name} cannot delegate to ${agentName}. ` +
        `Allowed delegations: ${this.allowedDelegations.join(', ')}`
      );
    }

    // Check delegation count
    const callChain = task.metadata?.callChain || [];
    const delegationCount = callChain.filter(agent => agent === this.name).length;
    if (delegationCount >= this.maxDelegations) {
      throw new Error(
        `Agent ${this.name} exceeded max delegations (${this.maxDelegations})`
      );
    }

    // Check for circular dependencies
    if (callChain.includes(agentName)) {
      throw new Error(
        `Circular dependency detected: ${[...callChain, agentName].join(' → ')}`
      );
    }

    // Check task depth
    const depth = (task.metadata?.depth || 0) + 1;
    if (depth > this.maxTaskDepth) {
      throw new Error(
        `Max task depth exceeded (${this.maxTaskDepth}). ` +
        `Call chain: ${callChain.join(' → ')}`
      );
    }

    // Update task metadata
    const delegatedTask: AgentTask = {
      ...task,
      parentTaskId: task.id,
      metadata: {
        ...task.metadata,
        callChain: [...callChain, this.name],
        depth,
      },
    };

    // This will be implemented by the AgentRegistry
    // For now, throw an error (will be overridden by dependency injection)
    throw new Error('Delegation not implemented - AgentRegistry required');
  }

  /**
   * Stream a response as chunks
   * Helper method for agents to stream formatted responses
   *
   * @param response Response data to stream
   */
  protected async *streamResponse(response: any): AsyncGenerator<StreamChunk> {
    // If response is a string, stream as tokens
    if (typeof response === 'string') {
      yield { type: 'token', content: response };
      yield { type: 'done' };
      return;
    }

    // If response is structured data, stream as a single content chunk
    yield { type: 'token', content: JSON.stringify(response, null, 2) };
    yield { type: 'done' };
  }

  /**
   * Validate task has required parameters
   * @param task Task to validate
   * @param requiredParams Required parameter names
   * @throws Error if required parameters are missing
   */
  protected validateTaskParameters(
    task: AgentTask,
    requiredParams: string[],
  ): void {
    const missing = requiredParams.filter(param => !(param in task.parameters));
    if (missing.length > 0) {
      throw new Error(
        `Missing required parameters for ${task.type}: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Create a subtask from the current task
   * @param parentTask Parent task
   * @param type Subtask type
   * @param parameters Subtask parameters
   * @param intent Subtask intent (defaults to parent intent)
   */
  protected createSubTask(
    parentTask: AgentTask,
    type: string,
    parameters: Record<string, any>,
    intent?: Intent,
  ): AgentTask {
    return {
      id: `${parentTask.id}-sub-${Date.now()}`,
      type,
      intent: intent || parentTask.intent,
      context: parentTask.context,
      parameters,
      priority: parentTask.priority - 1, // Subtasks have lower priority
      parentTaskId: parentTask.id,
      metadata: {
        ...parentTask.metadata,
        depth: (parentTask.metadata?.depth || 0) + 1,
      },
    };
  }

  /**
   * Log agent activity for debugging and monitoring
   * @param level Log level
   * @param message Log message
   * @param metadata Additional metadata
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: any,
  ): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      agent: this.name,
      level,
      message,
      ...metadata,
    };

    console.log(
      `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`,
      metadata ? JSON.stringify(metadata, null, 2) : ''
    );
  }
}
