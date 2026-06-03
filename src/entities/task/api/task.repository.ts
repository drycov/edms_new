/**
 * Task Repository
 */

import { supabase } from '@/shared/api/supabase';
import { BaseRepository, ApiError } from '@/shared/lib/repository';
import { Task, TaskFilter, CreateTaskInput, CompleteTaskInput } from './task';
import { TaskMapper, TaskDTO } from './task.mapper';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super('workflow_tasks');
  }

  protected query() {
    return supabase.from('workflow_tasks');
  }

  async findWithFilters(
    filter: TaskFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<Task[]> {
    try {
      let query = supabase.from('workflow_tasks').select('*');

      if (filter.assigneeId) {
        query = query.eq('assignee_id', filter.assigneeId);
      }

      if (filter.workflowRunId) {
        query = query.eq('workflow_run_id', filter.workflowRunId);
      }

      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      if (filter.taskType) {
        query = query.eq('task_type', filter.taskType);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw new ApiError(500, error.code, error.message);

      return (data || []).map((dto) => TaskMapper.toDomain(dto as TaskDTO));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async findAssignedToUser(userId: string): Promise<Task[]> {
    return this.findWithFilters({ assigneeId: userId });
  }

  async findByWorkflowRun(workflowRunId: string): Promise<Task[]> {
    return this.findWithFilters({ workflowRunId });
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .insert({
          workflow_run_id: input.workflowRunId,
          node_id: input.nodeId,
          task_type: input.taskType,
          assignee_id: input.assigneeId || null,
          due_date: input.dueDate?.toISOString() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return TaskMapper.toDomain(data as TaskDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async completeTask(
    taskId: string,
    input: CompleteTaskInput
  ): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .update({
          status: 'completed',
          outcome: input.outcome,
          comment: input.comment || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return TaskMapper.toDomain(data as TaskDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async assignTask(taskId: string, assigneeId: string): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .update({
          assignee_id: assigneeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return TaskMapper.toDomain(data as TaskDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async delegateTask(
    taskId: string,
    newAssigneeId: string,
    reason?: string
  ): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .update({
          assignee_id: newAssigneeId,
          status: 'delegated',
          delegated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return TaskMapper.toDomain(data as TaskDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async countPendingForUser(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('workflow_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .in('status', ['pending', 'in_progress']);

      if (error) throw new ApiError(500, error.code, error.message);
      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }
}

export const taskRepository = new TaskRepository();
