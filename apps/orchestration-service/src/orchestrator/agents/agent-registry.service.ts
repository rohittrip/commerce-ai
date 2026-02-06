import { Injectable, OnModuleInit } from '@nestjs/common';
import { BaseAgent, AgentTask, AgentResponse, AgentCapability } from './base.agent';
import { StreamChunk } from '../llm/provider.interface';
import { Intent } from '../../common/types';

/**
 * Agent registry manages all agents in the system
 * Handles agent registration, discovery, and execution
 */
@Injectable()
export class AgentRegistryService implements OnModuleInit {
  private agents: Map<string, BaseAgent> = new Map();
  private capabilityIndex: Map<AgentCapability, BaseAgent[]> = new Map();
  private intentIndex: Map<Intent, BaseAgent[]> = new Map();

  /**
   * Initialize the registry and build indices
   */
  async onModuleInit() {
    this.log('info', 'Agent registry initialized', {
      agentCount: this.agents.size,
    });
  }

  /**
   * Register an agent with the registry
   * @param agent Agent instance to register
   */
  registerAgent(agent: BaseAgent): void {
    // Check for duplicate agent names
    if (this.agents.has(agent.name)) {
      throw new Error(`Agent ${agent.name} is already registered`);
    }

    this.agents.set(agent.name, agent);

    // Index by capabilities
    for (const capability of agent.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, []);
      }
      this.capabilityIndex.get(capability)!.push(agent);
    }

    this.log('info', `Registered agent: ${agent.name}`, {
      capabilities: agent.capabilities,
      priority: agent.priority,
    });
  }

  /**
   * Get an agent by name
   * @param name Agent name
   * @returns Agent instance or undefined if not found
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Find an agent that can handle a specific task
   * Returns the highest priority agent that can handle the task
   *
   * @param task Task to find an agent for
   * @returns Agent that can handle the task, or undefined if none found
   */
  findAgent(task: AgentTask): BaseAgent | undefined {
    // Get all registered agents
    const candidates = Array.from(this.agents.values())
      .filter(agent => agent.canHandle(task))
      .sort((a, b) => b.priority - a.priority); // Sort by priority descending

    if (candidates.length === 0) {
      this.log('warn', `No agent found for task ${task.type}`, {
        taskId: task.id,
        intent: task.intent,
      });
      return undefined;
    }

    const selectedAgent = candidates[0];
    this.log('debug', `Selected agent ${selectedAgent.name} for task ${task.type}`, {
      taskId: task.id,
      agentPriority: selectedAgent.priority,
      totalCandidates: candidates.length,
    });

    return selectedAgent;
  }

  /**
   * Find all agents with a specific capability
   * @param capability Capability to search for
   * @returns Array of agents with the capability, sorted by priority
   */
  findAgentsByCapability(capability: AgentCapability): BaseAgent[] {
    const agents = this.capabilityIndex.get(capability) || [];
    return agents.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute a task using the appropriate agent
   * Automatically finds the best agent for the task and executes it
   *
   * @param task Task to execute
   * @yields StreamChunk results from the agent
   * @throws Error if no agent can handle the task
   */
  async *executeTask(task: AgentTask): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    try {
      // Find agent for the task
      const agent = this.findAgent(task);
      if (!agent) {
        throw new Error(`No agent available to handle task type: ${task.type}`);
      }

      this.log('info', `Executing task ${task.id} with agent ${agent.name}`, {
        taskType: task.type,
        intent: task.intent,
      });

      // Execute the task through the agent
      yield* agent.execute(task);

      const duration = Date.now() - startTime;
      this.log('info', `Task ${task.id} completed successfully`, {
        agent: agent.name,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Task ${task.id} failed`, {
        error: error.message,
        duration,
      });

      // Stream error to client
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Delegate a task from one agent to another
   * This is used by agents to delegate subtasks
   *
   * @param task Task to delegate
   * @param targetAgentName Name of the agent to delegate to (optional, auto-selected if not provided)
   * @returns AgentResponse from the delegated agent
   * @throws Error if target agent not found or cannot handle task
   */
  async delegateTask(
    task: AgentTask,
    targetAgentName?: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Get target agent
      let targetAgent: BaseAgent | undefined;

      if (targetAgentName) {
        targetAgent = this.getAgent(targetAgentName);
        if (!targetAgent) {
          throw new Error(`Agent ${targetAgentName} not found in registry`);
        }
        if (!targetAgent.canHandle(task)) {
          throw new Error(`Agent ${targetAgentName} cannot handle task ${task.type}`);
        }
      } else {
        targetAgent = this.findAgent(task);
        if (!targetAgent) {
          throw new Error(`No agent available to handle delegated task ${task.type}`);
        }
      }

      this.log('debug', `Delegating task ${task.id} to ${targetAgent.name}`, {
        parentTask: task.parentTaskId,
        callChain: task.metadata?.callChain,
      });

      // Collect all chunks from the agent
      const chunks: StreamChunk[] = [];
      for await (const chunk of targetAgent.execute(task)) {
        chunks.push(chunk);
      }

      // Build response
      const duration = Date.now() - startTime;
      const response: AgentResponse = {
        taskId: task.id,
        agentName: targetAgent.name,
        status: 'success',
        data: this.aggregateChunks(chunks),
        metadata: {
          duration,
          toolsCalled: this.extractToolsCalledFrom(chunks),
          confidence: 1.0, // TODO: Calculate confidence based on agent response
        },
      };

      this.log('debug', `Delegation completed for task ${task.id}`, {
        targetAgent: targetAgent.name,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.log('error', `Delegation failed for task ${task.id}`, {
        error: error.message,
        duration,
      });

      return {
        taskId: task.id,
        agentName: targetAgentName || 'unknown',
        status: 'failure',
        error: {
          code: 'INTERNAL_ERROR' as any,
          message: error.message,
        },
        metadata: {
          duration,
          toolsCalled: [],
          confidence: 0,
        },
      };
    }
  }

  /**
   * Get all registered agents
   * @returns Array of all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    agentsByCapability: Record<string, number>;
    agents: Array<{ name: string; capabilities: AgentCapability[]; priority: number }>;
  } {
    const agentsByCapability: Record<string, number> = {};

    for (const [capability, agents] of this.capabilityIndex.entries()) {
      agentsByCapability[capability] = agents.length;
    }

    return {
      totalAgents: this.agents.size,
      agentsByCapability,
      agents: Array.from(this.agents.values()).map(agent => ({
        name: agent.name,
        capabilities: agent.capabilities,
        priority: agent.priority,
      })),
    };
  }

  // Private helper methods

  /**
   * Aggregate chunks into a single response
   */
  private aggregateChunks(chunks: StreamChunk[]): any {
    // If only one chunk, return its content
    if (chunks.length === 1) {
      return chunks[0].content;
    }

    // Concatenate all token chunks
    const tokens = chunks
      .filter(chunk => chunk.type === 'token' && chunk.content)
      .map(chunk => chunk.content)
      .join('');

    // Check if there are tool calls
    const toolCalls = chunks
      .filter(chunk => chunk.type === 'tool_call')
      .map(chunk => chunk.toolCall);

    if (toolCalls.length > 0) {
      return {
        content: tokens,
        toolCalls,
      };
    }

    return tokens || null;
  }

  /**
   * Extract tool names from chunks
   */
  private extractToolsCalledFrom(chunks: StreamChunk[]): string[] {
    return chunks
      .filter(chunk => chunk.type === 'tool_call' && chunk.toolCall)
      .map(chunk => chunk.toolCall!.name);
  }

  /**
   * Log registry activity
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: any,
  ): void {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${level.toUpperCase()}] [AgentRegistry] ${message}`,
      metadata ? JSON.stringify(metadata, null, 2) : ''
    );
  }
}
