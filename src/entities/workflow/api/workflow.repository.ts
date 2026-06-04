/**
 * Workflow Repository
 */

import { supabase } from '@/shared/api/supabase';
import { BaseRepository, ApiError } from '@/shared/lib/repository';
import {
  Workflow,
  WorkflowFilter,
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from '../model/workflow';
import { WorkflowMapper, WorkflowDTO } from '../model/workflow.mapper';

export class WorkflowRepository extends BaseRepository<Workflow> {
  constructor() {
    super('workflows');
  }

  protected query() {
    return supabase.from('workflows');
  }

  async findWithFilters(
    filter: WorkflowFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<Workflow[]> {
    try {
      let query = supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', filter.organizationId);

      if (filter.isPublished !== undefined) {
        query = query.eq('is_published', filter.isPublished);
      }

      if (filter.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }

      if (filter.createdById) {
        query = query.eq('created_by', filter.createdById);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw new ApiError(500, error.code, error.message);

      return (data || []).map((dto) =>
        WorkflowMapper.toDomain(dto as WorkflowDTO)
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async findByOrganization(organizationId: string): Promise<Workflow[]> {
    return this.findWithFilters({ organizationId });
  }

  async createWorkflow(
    organizationId: string,
    createdById: string,
    input: CreateWorkflowInput
  ): Promise<Workflow> {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description || null,
          trigger_type: input.triggerType || 'manual',
          organization_id: organizationId,
          created_by: createdById,
          version: 1,
          is_published: false,
          is_active: false,
          definition: { nodes: [], edges: [] },
        })
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return WorkflowMapper.toDomain(data as WorkflowDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async updateWorkflow(
    workflowId: string,
    input: UpdateWorkflowInput
  ): Promise<Workflow> {
    try {
      const updates: any = {};

      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.triggerType !== undefined)
        updates.trigger_type = input.triggerType;

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return WorkflowMapper.toDomain(data as WorkflowDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async publishWorkflow(workflowId: string): Promise<Workflow> {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update({
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return WorkflowMapper.toDomain(data as WorkflowDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async toggleActive(workflowId: string, isActive: boolean): Promise<Workflow> {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return WorkflowMapper.toDomain(data as WorkflowDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw new ApiError(500, error.code, error.message);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async countByOrganization(organizationId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('workflows')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (error) throw new ApiError(500, error.code, error.message);
      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }
}

export const workflowRepository = new WorkflowRepository();
