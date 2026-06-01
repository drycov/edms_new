export type WorkflowNodeType =
  | 'start'
  | 'approval'
  | 'task'
  | 'condition'
  | 'signature'
  | 'notification'
  | 'timer'
  | 'archive'
  | 'parallel'
  | 'merge'
  | 'end';

export type WorkflowNode = {
  id: string;
  workflow_id: string;

  node_key: string;
  name: string;
  node_type: WorkflowNodeType;

  position_x: number;
  position_y: number;

  config: Record<string, unknown>;
};

export type WorkflowConnection = {
  id: string;
  workflow_id: string;

  source_node_id: string;
  target_node_id: string;

  condition_type: 'always' | 'expression' | 'status' | string;
  condition_expression: Record<string, unknown> | null;
};

export type WorkflowSettings = {
  name: string;
  code: string;
  description: string;
  trigger_type: 'manual' | 'document_created' | 'document_registered' | 'scheduled' | string;
  default_sla_hours: number;
};