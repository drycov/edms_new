/**
 * Workflow DTO + Mapper
 */

import type { Tables } from '@/shared/api/supabase';
import { Workflow, WorkflowEntity } from './workflow';

export type WorkflowDTO = Tables<'workflows'>;

export class WorkflowMapper {
  static toDomain(dto: WorkflowDTO): Workflow {
    return {
      id: dto.id,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      version: dto.version,
      isPublished: dto.is_published,
      isActive: dto.is_active,
      triggerType: dto.trigger_type,
      organizationId: dto.organization_id,
      createdById: dto.created_by,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  static toDTO(entity: Workflow): Partial<WorkflowDTO> {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      description: entity.description,
      version: entity.version,
      is_published: entity.isPublished,
      is_active: entity.isActive,
      trigger_type: entity.triggerType,
      organization_id: entity.organizationId,
      created_by: entity.createdById,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  static createEntity(dto: WorkflowDTO): WorkflowEntity {
    return new WorkflowEntity(this.toDomain(dto));
  }
}
