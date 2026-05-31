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

export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'error'
  | 'paused';

export type WorkflowNode = {
  id: string;
  workflow_id: string;
  node_key: string;
  name: string;
  description: string | null;
  node_type: WorkflowNodeType;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  assignee_type: string | null;
  assignee_value: Record<string, unknown> | null;
  sla_hours: number | null;
  timeout_hours: number | null;
  timeout_action: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WorkflowConnection = {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  condition_type: string | null;
  condition_expression: Record<string, unknown> | null;
  label: string | null;
  order_index: number;
  created_at: string;
};

export type Workflow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  version: number;
  is_published: boolean;
  published_at: string | null;
  is_active: boolean;
  auto_start: boolean;
  allow_restart: boolean;
  default_sla_hours: number | null;
  escalation_config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
};

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  document_id: string | null;
  status: WorkflowStatus;
  current_nodes: string[];
  current_node_ids: string[];
  variables: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  sla_deadline: string | null;
  sla_status: string;
  initiator_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  workflow?: Workflow;
  tasks?: WorkflowTask[];
};

export type WorkflowTask = {
  id: string;
  workflow_run_id: string;
  workflow_node_id: string;
  assignee_id: string | null;
  assignee_type: string | null;
  assignee_value: Record<string, unknown> | null;
  status: string;
  result: string | null;
  delegated_from_task_id: string | null;
  delegation_chain: string[];
  comment: string | null;
  due_date: string | null;
  sla_deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  node?: WorkflowNode;
  assignee?: {
    id: string;
    full_name: string | null;
  email?: string;
  avatar_url?: string | null;
  position?: string | null;
  is_active?: boolean;
  department_id?: string | null;
    created_at?: string;
  } | null;
};

export type WorkflowEvent = {
  id: string;
  workflow_run_id: string;
  event_type: string;
  node_id: string | null;
  node_key: string | null;
  from_node_id: string | null;
  to_node_id: string | null;
  actor_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
};

export const workflowNodeTypeLabels: Record<WorkflowNodeType, string> = {
  start: 'Start',
  approval: 'Approval',
  condition: 'Condition',
  task: 'Task',
  timer: 'Timer',
  escalation: 'Escalation',
  notification: 'Notification',
  signature: 'Digital Signature',
  archive: 'Archive',
  parallel: 'Parallel Branch',
  merge: 'Merge',
  end: 'End',
};

export const workflowNodeTypeColors: Record<WorkflowNodeType, string> = {
  start: 'bg-green-500',
  approval: 'bg-amber-500',
  condition: 'bg-blue-500',
  task: 'bg-cyan-500',
  timer: 'bg-orange-500',
  escalation: 'bg-red-500',
  notification: 'bg-purple-500',
  signature: 'bg-emerald-500',
  archive: 'bg-slate-500',
  parallel: 'bg-indigo-500',
  merge: 'bg-indigo-500',
  end: 'bg-gray-500',
};

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  idle: 'Not Started',
  running: 'Running',
  completed: 'Completed',
  cancelled: 'Cancelled',
  error: 'Error',
  paused: 'Paused',
};

export const workflowStatusColors: Record<WorkflowStatus, string> = {
  idle: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
  paused: 'bg-amber-100 text-amber-800',
};

export const taskStatusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  delegated: 'Delegated',
};

export const taskStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  delegated: 'bg-amber-100 text-amber-800',
};
