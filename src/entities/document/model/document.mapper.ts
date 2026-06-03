/**
 * Document DTO + Mapper
 *
 * Maps between database DTO and domain entity.
 * Handles type conversions and transformations.
 */

import type { Tables } from '@/shared/api/supabase';
import {
  Document,
  DocumentEntity,
  DocumentWithRelations,
} from './document';

/**
 * Document Data Transfer Object (from database)
 */
export type DocumentDTO = Tables<'documents'>;

/**
 * Maps between database DTO and domain entity
 */
export class DocumentMapper {
  /**
   * Convert database DTO to domain entity
   */
  static toDomain(dto: DocumentDTO): Document {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      content: dto.content,
      status: dto.status as any,
      registrationNumber: dto.registration_number,
      registrationDate: dto.registration_date
        ? new Date(dto.registration_date)
        : null,
      versionNumber: dto.version_number,
      versionLabel: dto.version_label,
      documentTypeId: dto.document_type_id,
      organizationId: dto.organization_id,
      createdById: dto.created_by,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
      isDeleted: dto.is_deleted,
      deletedAt: dto.deleted_at ? new Date(dto.deleted_at) : null,
    };
  }

  /**
   * Convert domain entity back to database DTO
   */
  static toDTO(entity: Document): Partial<DocumentDTO> {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      content: entity.content,
      status: entity.status as any,
      registration_number: entity.registrationNumber,
      registration_date: entity.registrationDate
        ? entity.registrationDate.toISOString()
        : null,
      version_number: entity.versionNumber,
      version_label: entity.versionLabel,
      document_type_id: entity.documentTypeId,
      organization_id: entity.organizationId,
      created_by: entity.createdById,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      is_deleted: entity.isDeleted,
      deleted_at: entity.deletedAt ? entity.deletedAt.toISOString() : null,
    };
  }

  /**
   * Convert with relations
   */
  static toDomainWithRelations(
    dto: DocumentDTO & {
      document_type?: { id: string; name: string } | null;
      created_by_user?: { id: string; full_name: string; email: string } | null;
    }
  ): DocumentWithRelations {
    const base = this.toDomain(dto);
    return {
      ...base,
      documentType: dto.document_type
        ? { id: dto.document_type.id, name: dto.document_type.name }
        : undefined,
      createdBy: dto.created_by_user
        ? {
            id: dto.created_by_user.id,
            fullName: dto.created_by_user.full_name,
            email: dto.created_by_user.email,
          }
        : undefined,
    };
  }

  /**
   * Create domain entity
   */
  static createEntity(dto: DocumentDTO): DocumentEntity {
    return new DocumentEntity(this.toDomain(dto));
  }
}
