/**
 * Task Domain Types
 */

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'delegated'
  | 'escalated';

export type TaskOutcome = 'approved' | 'rejected' | 'signed' | 'skipped';

export interface Task {
  id: string;
  workflowRunId: string;
  nodeId: string;
  taskType: string;
  status: TaskStatus;
  assigneeId: string | null;
  outcome: TaskOutcome | null;
  dueDate: Date | null;
  completedAt: Date | null;
  delegatedFrom: string | null;
  delegatedAt: Date | null;
  reassignedBy: string | null;
  reassignedAt: Date | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  workflowRunId: string;
  nodeId: string;
  taskType: string;
  assigneeId?: string;
  dueDate?: Date;
}

export interface CompleteTaskInput {
  outcome: TaskOutcome;
  comment?: string;
}

export interface TaskFilter {
  assigneeId?: string;
  workflowRunId?: string;
  status?: TaskStatus;
  taskType?: string;
}

export class TaskEntity implements Task {
  constructor(public task: Task) {}

  id = this.task.id;
  workflowRunId = this.task.workflowRunId;
  nodeId = this.task.nodeId;
  taskType = this.task.taskType;
  status = this.task.status;
  assigneeId = this.task.assigneeId;
  outcome = this.task.outcome;
  dueDate = this.task.dueDate;
  completedAt = this.task.completedAt;
  delegatedFrom = this.task.delegatedFrom;
  delegatedAt = this.task.delegatedAt;
  reassignedBy = this.task.reassignedBy;
  reassignedAt = this.task.reassignedAt;
  comment = this.task.comment;
  createdAt = this.task.createdAt;
  updatedAt = this.task.updatedAt;

  isPending(): boolean {
    return this.status === 'pending';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  canDelegate(): boolean {
    return (
      this.status === 'pending' ||
      (this.status === 'in_progress' && !this.delegatedFrom)
    );
  }

  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status !== 'completed';
  }
}
