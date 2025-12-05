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
 * WARNING: This is an in-memory implementation and status will be lost on service restart.
 * For production use, consider using a persistent store (Redis, database) to maintain
 * workflow state across restarts and instances.
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
