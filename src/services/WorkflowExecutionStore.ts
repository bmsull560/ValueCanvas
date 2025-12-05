/**
 * Represents the execution status of a workflow.
 * - RUNNING: Workflow is actively executing
 * - PAUSED: Workflow is temporarily paused and can be resumed
 * - HALTED: Workflow is stopped and cannot continue
 */
export type WorkflowStatus = 'RUNNING' | 'PAUSED' | 'HALTED';

/**
 * Represents a workflow execution with its current status.
 */
export interface WorkflowExecution {
  id: string;
  status: WorkflowStatus;
}

/**
 * In-memory store for tracking workflow execution status.
 * 
 * ⚠️ IMPORTANT LIMITATION:
 * This is an in-memory implementation and workflow status will be LOST on:
 * - Service restart
 * - Process crash
 * - Deployment
 * - Running multiple instances (no shared state)
 * 
 * For production deployments with high availability requirements:
 * 1. Replace this with Redis (see src/middleware/llmRateLimiter.ts for Redis client example)
 * 2. Use a database table with indexed lookups
 * 3. Use the existing workflow state management system
 * 
 * This implementation is suitable for:
 * - Development environments
 * - Single-instance deployments
 * - Non-critical workflow pause/halt features
 * - Testing
 * 
 * @example
 * ```typescript
 * // Set workflow status
 * workflowExecutionStore.setStatus('workflow-123', 'PAUSED');
 * 
 * // Get workflow status (defaults to RUNNING if not set)
 * const status = workflowExecutionStore.getStatus('workflow-123');
 * ```
 */
class WorkflowExecutionStore {
  private executions: Map<string, WorkflowStatus> = new Map();

  /**
   * Sets the execution status for a workflow.
   * @param id - Workflow identifier
   * @param status - New status for the workflow
   */
  setStatus(id: string, status: WorkflowStatus): void {
    this.executions.set(id, status);
  }

  /**
   * Gets the execution status for a workflow.
   * @param id - Workflow identifier
   * @returns The workflow status, defaulting to 'RUNNING' if not previously set
   */
  getStatus(id: string): WorkflowStatus {
    return this.executions.get(id) || 'RUNNING';
  }
}

export const workflowExecutionStore = new WorkflowExecutionStore();
