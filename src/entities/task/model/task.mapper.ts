/**
 * Task DTO + Mapper
 */

import type { Tables } from '@/shared/api/supabase';
import { Task, TaskEntity } from './task';

export type TaskDTO = Tables<'workflow_tasks'>;

export class TaskMapper {
  static toDomain(dto: TaskDTO): Task {
    return {
      id: dto.id,
      workflowRunId: dto.workflow_run_id,
      nodeId: dto.node_id,
      taskType: dto.task_type,
      status: dto.status as any,
      assigneeId: dto.assignee_id,
      outcome: dto.outcome as any,
      dueDate: dto.due_date ? new Date(dto.due_date) : null,
      completedAt: dto.completed_at ? new Date(dto.completed_at) : null,
      delegatedFrom: dto.delegated_from,
      delegatedAt: dto.delegated_at ? new Date(dto.delegated_at) : null,
      reassignedBy: dto.reassigned_by,
      reassignedAt: dto.reassigned_at ? new Date(dto.reassigned_at) : null,
      comment: dto.comment,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  static toDTO(entity: Task): Partial<TaskDTO> {
    return {
      id: entity.id,
      workflow_run_id: entity.workflowRunId,
      node_id: entity.nodeId,
      task_type: entity.taskType,
      status: entity.status as any,
      assignee_id: entity.assigneeId,
      outcome: entity.outcome as any,
      due_date: entity.dueDate?.toISOString(),
      completed_at: entity.completedAt?.toISOString(),
      delegated_from: entity.delegatedFrom,
      delegated_at: entity.delegatedAt?.toISOString(),
      reassigned_by: entity.reassignedBy,
      reassigned_at: entity.reassignedAt?.toISOString(),
      comment: entity.comment,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  static createEntity(dto: TaskDTO): TaskEntity {
    return new TaskEntity(this.toDomain(dto));
  }
}
