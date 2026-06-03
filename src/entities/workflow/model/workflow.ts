/**
 * Workflow Domain Types
 *
 * Pure domain models for workflow engine.
 */

export type WorkflowNodeType =
  | 'start'
  | 'approval'
  | 'condition'
  | 'task'
  | 'timer'
  | 'escalation'
  | 'notification'
  | 'signature'
  | 'archive'
  | 'parallel'
  | 'merge'
  | 'end';

export type WorkflowRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'error'
  | 'paused';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'delegated'
  | 'escalated';

export type TaskOutcome = 'approved' | 'rejected' | 'signed' | 'skipped';

export interface Workflow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  isActive: boolean;
  triggerType: string;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  nodeType: WorkflowNodeType;
  title: string;
  description: string | null;
  position: { x: number; y: number };
  config: Record<string, any>;
  createdAt: Date;
}

export interface WorkflowConnection {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition: string | null;
  createdAt: Date;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  documentId: string;
  status: WorkflowRunStatus;
  currentNodeId: string | null;
  organizationId: string;
  startedById: string;
  startedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export interface WorkflowTask {
  id: string;
  workflowRunId: string;
  nodeId: string;
  taskType: string;
  status: TaskStatus;
  assigneeId: string | null;
  outcome: TaskOutcome | null;
  dueDdate: Date | null;
  completedAt: Date | null;
  delegatedFrom: string | null;
  delegatedAt: Date | null;
  reassignedBy: string | null;
  reassignedAt: Date | null;
  comment: string | null;
  createdAt: Date;
}

export interface WorkflowEvent {
  id: string;
  workflowRunId: string;
  eventType: string;
  data: Record<string, any>;
  createdAt: Date;
}

export interface CreateWorkflowInput {
  name: string;
  code: string;
  description?: string;
  triggerType?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  triggerType?: string;
}

export interface WorkflowFilter {
  organizationId: string;
  isPublished?: boolean;
  isActive?: boolean;
  createdById?: string;
}

export class WorkflowEntity implements Workflow {
  constructor(public workflow: Workflow) {}

  id = this.workflow.id;
  name = this.workflow.name;
  code = this.workflow.code;
  description = this.workflow.description;
  version = this.workflow.version;
  isPublished = this.workflow.isPublished;
  isActive = this.workflow.isActive;
  triggerType = this.workflow.triggerType;
  organizationId = this.workflow.organizationId;
  createdById = this.workflow.createdById;
  createdAt = this.workflow.createdAt;
  updatedAt = this.workflow.updatedAt;

  canEdit(): boolean {
    return !this.isPublished;
  }

  canPublish(): boolean {
    return !this.isPublished;
  }

  canStart(): boolean {
    return this.isPublished && this.isActive;
  }

  canAddNode(): boolean {
    return !this.isPublished;
  }

  canAddConnection(): boolean {
    return !this.isPublished;
  }
}
