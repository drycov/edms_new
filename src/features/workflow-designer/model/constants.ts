import { WorkflowNodeType } from './types';

/**
 * UI CONFIG FOR NODE TYPES
 * (визуальный слой — не бизнес-логика)
 */
export const nodeTypeConfig: Record<
  WorkflowNodeType,
  {
    label: string;
    color: string;
    icon: string;
  }
> = {
  start: {
    label: 'Start',
    color: 'bg-green-500',
    icon: '▶',
  },

  approval: {
    label: 'Approval',
    color: 'bg-blue-500',
    icon: '✓',
  },

  task: {
    label: 'Task',
    color: 'bg-purple-500',
    icon: '☐',
  },

  condition: {
    label: 'Condition',
    color: 'bg-yellow-500',
    icon: '⟂',
  },

  signature: {
    label: 'Signature',
    color: 'bg-indigo-500',
    icon: '✍',
  },

  notification: {
    label: 'Notification',
    color: 'bg-cyan-500',
    icon: '◉',
  },

  timer: {
    label: 'Timer',
    color: 'bg-orange-500',
    icon: '⏱',
  },

  archive: {
    label: 'Archive',
    color: 'bg-slate-500',
    icon: '📦',
  },

  parallel: {
    label: 'Parallel',
    color: 'bg-teal-500',
    icon: '⫢',
  },

  merge: {
    label: 'Merge',
    color: 'bg-teal-600',
    icon: '⫡',
  },

  end: {
    label: 'End',
    color: 'bg-red-500',
    icon: '■',
  },
};

/**
 * DEFAULT WORKFLOW SETTINGS
 */
export const defaultWorkflowSettings = {
  name: '',
  code: '',
  description: '',
  trigger_type: 'manual',
  default_sla_hours: 72,
} satisfies Record<string, any>;