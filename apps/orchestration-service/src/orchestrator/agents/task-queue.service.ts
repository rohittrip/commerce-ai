import { Injectable } from '@nestjs/common';
import { AgentTask } from './base.agent';

/**
 * Task execution order
 */
export enum TaskExecutionMode {
  SEQUENTIAL = 'SEQUENTIAL',  // Execute tasks one by one
  PARALLEL = 'PARALLEL',      // Execute tasks simultaneously
}

/**
 * Task queue manages task dependencies and execution order
 * Prevents circular dependencies and enforces correct execution order
 */
@Injectable()
export class TaskQueueService {
  private readonly MAX_TASK_DEPTH = 5;

  /**
   * Validate task dependencies
   * Ensures no circular dependencies and all dependencies exist
   *
   * @param task Task to validate
   * @param allTasks All tasks in the queue
   * @throws Error if validation fails
   */
  validateTaskDependencies(task: AgentTask, allTasks: Map<string, AgentTask>): void {
    // Check task depth
    const depth = task.metadata?.depth || 0;
    if (depth > this.MAX_TASK_DEPTH) {
      throw new Error(
        `Task ${task.id} exceeds max depth (${this.MAX_TASK_DEPTH}). ` +
        `Call chain: ${task.metadata?.callChain?.join(' → ') || 'unknown'}`
      );
    }

    // Check for circular dependencies
    if (task.dependencies) {
      this.detectCircularDependencies(task, allTasks);
    }

    // Validate all dependencies exist
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!allTasks.has(depId)) {
          throw new Error(
            `Task ${task.id} depends on non-existent task ${depId}`
          );
        }
      }
    }
  }

  /**
   * Detect circular dependencies in task graph
   * @param task Task to check
   * @param allTasks All tasks in the queue
   * @param visited Set of visited task IDs (used for recursion)
   * @throws Error if circular dependency detected
   */
  private detectCircularDependencies(
    task: AgentTask,
    allTasks: Map<string, AgentTask>,
    visited: Set<string> = new Set(),
  ): void {
    // Add current task to visited set
    visited.add(task.id);

    // Check each dependency
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        // Circular dependency detected
        if (visited.has(depId)) {
          const cycle = Array.from(visited).concat(depId).join(' → ');
          throw new Error(`Circular dependency detected: ${cycle}`);
        }

        // Recursively check dependency's dependencies
        const depTask = allTasks.get(depId);
        if (depTask) {
          this.detectCircularDependencies(depTask, allTasks, new Set(visited));
        }
      }
    }
  }

  /**
   * Build execution order for tasks with dependencies
   * Returns tasks in topological sort order (dependencies first)
   *
   * @param tasks Tasks to order
   * @returns Ordered task array
   */
  buildExecutionOrder(tasks: AgentTask[]): AgentTask[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const result: AgentTask[] = [];

    // Helper function for depth-first search
    const visit = (task: AgentTask) => {
      if (visited.has(task.id)) {
        return;
      }

      visited.add(task.id);

      // Visit all dependencies first
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const depTask = taskMap.get(depId);
          if (depTask) {
            visit(depTask);
          }
        }
      }

      // Add task to result
      result.push(task);
    };

    // Visit all tasks
    for (const task of tasks) {
      visit(task);
    }

    return result;
  }

  /**
   * Group tasks by execution mode
   * Returns tasks that can be executed in parallel vs sequentially
   *
   * @param tasks Tasks to group
   * @returns Groups of tasks for parallel and sequential execution
   */
  groupTasksByExecutionMode(tasks: AgentTask[]): {
    parallel: AgentTask[][];  // Groups of tasks that can run in parallel
    sequential: AgentTask[];  // Tasks that must run sequentially
  } {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const hasDependencies = (task: AgentTask) => {
      return task.dependencies && task.dependencies.length > 0;
    };

    // Tasks with no dependencies can run in parallel
    const independent = tasks.filter(t => !hasDependencies(t));

    // Tasks with dependencies must be ordered
    const dependent = tasks.filter(t => hasDependencies(t));

    // Group independent tasks by priority
    const parallelGroups: AgentTask[][] = [];
    if (independent.length > 0) {
      // Group by priority level
      const byPriority = new Map<number, AgentTask[]>();
      for (const task of independent) {
        const priority = task.priority;
        if (!byPriority.has(priority)) {
          byPriority.set(priority, []);
        }
        byPriority.get(priority)!.push(task);
      }

      // Convert to array of groups, sorted by priority
      const priorities = Array.from(byPriority.keys()).sort((a, b) => b - a);
      for (const priority of priorities) {
        parallelGroups.push(byPriority.get(priority)!);
      }
    }

    // Build execution order for dependent tasks
    const sequential = this.buildExecutionOrder(dependent);

    return {
      parallel: parallelGroups,
      sequential,
    };
  }

  /**
   * Find tasks that are ready to execute
   * (all dependencies have been completed)
   *
   * @param tasks All tasks
   * @param completedTaskIds Set of completed task IDs
   * @returns Tasks that are ready to execute
   */
  findReadyTasks(
    tasks: AgentTask[],
    completedTaskIds: Set<string>,
  ): AgentTask[] {
    return tasks.filter(task => {
      // Task already completed
      if (completedTaskIds.has(task.id)) {
        return false;
      }

      // No dependencies - ready to execute
      if (!task.dependencies || task.dependencies.length === 0) {
        return true;
      }

      // All dependencies completed - ready to execute
      return task.dependencies.every(depId => completedTaskIds.has(depId));
    });
  }

  /**
   * Calculate task priority based on dependencies
   * Tasks with more dependencies get lower priority
   *
   * @param task Task to calculate priority for
   * @param allTasks All tasks in the queue
   * @returns Calculated priority
   */
  calculateTaskPriority(task: AgentTask, allTasks: Map<string, AgentTask>): number {
    let priority = task.priority;

    // Reduce priority based on number of dependencies
    if (task.dependencies) {
      priority -= task.dependencies.length * 0.1;
    }

    // Increase priority if other tasks depend on this one
    const dependentCount = Array.from(allTasks.values()).filter(t =>
      t.dependencies?.includes(task.id)
    ).length;
    priority += dependentCount * 0.2;

    return priority;
  }

  /**
   * Get task statistics
   * @param tasks Tasks to analyze
   * @returns Task statistics
   */
  getTaskStats(tasks: AgentTask[]): {
    totalTasks: number;
    independentTasks: number;
    dependentTasks: number;
    maxDepth: number;
    avgDependencies: number;
  } {
    const independent = tasks.filter(t => !t.dependencies || t.dependencies.length === 0);
    const dependent = tasks.filter(t => t.dependencies && t.dependencies.length > 0);

    const maxDepth = Math.max(...tasks.map(t => t.metadata?.depth || 0), 0);

    const totalDeps = tasks.reduce((sum, t) => sum + (t.dependencies?.length || 0), 0);
    const avgDependencies = tasks.length > 0 ? totalDeps / tasks.length : 0;

    return {
      totalTasks: tasks.length,
      independentTasks: independent.length,
      dependentTasks: dependent.length,
      maxDepth,
      avgDependencies,
    };
  }

  /**
   * Merge task results
   * Combines results from multiple tasks into a single response
   *
   * @param results Array of task results
   * @returns Merged result
   */
  mergeTaskResults(results: any[]): any {
    // If only one result, return it directly
    if (results.length === 1) {
      return results[0];
    }

    // If all results are arrays, concatenate them
    if (results.every(r => Array.isArray(r))) {
      return results.flat();
    }

    // If all results are objects, merge them
    if (results.every(r => typeof r === 'object' && r !== null && !Array.isArray(r))) {
      return Object.assign({}, ...results);
    }

    // Otherwise, return as array
    return results;
  }
}
