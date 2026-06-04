/**
 * Document Repository
 *
 * Handles all database operations for documents.
 * Bridges domain layer and infrastructure layer.
 */

import { supabase } from '@/shared/api/supabase';
import { BaseRepository, ApiError } from '@/shared/lib/repository';
import {
  Document,
  DocumentFilter,
  DocumentSort,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../model/document';
import { DocumentMapper, DocumentDTO } from '../model/document.mapper';

export class DocumentRepository extends BaseRepository<Document> {
  constructor() {
    super('documents');
  }

  protected query() {
    return supabase.from('documents');
  }

  /**
   * Find documents with filters and sorting
   */
  async findWithFilters(
    filter: DocumentFilter,
    sort?: DocumentSort,
    limit: number = 50,
    offset: number = 0
  ): Promise<Document[]> {
    try {
      let query = supabase
        .from('documents')
        .select(
          `
          *,
          document_type:document_types(id, name),
          created_by_user:profiles!documents_created_by_fkey(id, full_name, email)
        `
        )
        .eq('organization_id', filter.organizationId);

      // Apply status filter
      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      // Apply document type filter
      if (filter.documentTypeId) {
        query = query.eq('document_type_id', filter.documentTypeId);
      }

      // Apply created by filter
      if (filter.createdById) {
        query = query.eq('created_by', filter.createdById);
      }

      // Apply deleted filter (default: only active)
      const isDeleted = filter.isDeleted ?? false;
      query = query.eq('is_deleted', isDeleted);

      // Apply date range filter
      if (filter.dateFrom) {
        query = query.gte('created_at', filter.dateFrom.toISOString());
      }
      if (filter.dateTo) {
        query = query.lte('created_at', filter.dateTo.toISOString());
      }

      // Apply full-text search
      if (filter.search && filter.search.length > 0) {
        query = query.or(
          `title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`
        );
      }

      // Apply sorting
      if (sort) {
        const sortField =
          sort.field === 'createdAt'
            ? 'created_at'
            : sort.field === 'updatedAt'
              ? 'updated_at'
              : sort.field === 'registrationNumber'
                ? 'registration_number'
                : 'title';

        query = query.order(sortField, {
          ascending: sort.direction === 'asc',
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw new ApiError(500, error.code, error.message);

      return (data || []).map((dto) =>
        DocumentMapper.toDomain(dto as DocumentDTO)
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Find by organization
   */
  async findByOrganization(organizationId: string): Promise<Document[]> {
    return this.findWithFilters({
      organizationId,
      isDeleted: false,
    });
  }

  /**
   * Create document
   */
  async createDocument(
    organizationId: string,
    createdById: string,
    input: CreateDocumentInput
  ): Promise<Document> {
    try {
      const data = {
        title: input.title,
        description: input.description || null,
        content: input.content,
        status: 'draft' as const,
        document_type_id: input.documentTypeId || null,
        organization_id: organizationId,
        created_by: createdById,
        version_number: 1,
        version_label: '1.0',
        is_deleted: false,
      };

      const { data: result, error } = await supabase
        .from('documents')
        .insert(data)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return DocumentMapper.toDomain(result as DocumentDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Update document
   */
  async updateDocument(
    documentId: string,
    input: UpdateDocumentInput
  ): Promise<Document> {
    try {
      const updates: any = {};

      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.content !== undefined) updates.content = input.content;
      if (input.status !== undefined) updates.status = input.status;
      if (input.registrationNumber !== undefined)
        updates.registration_number = input.registrationNumber;
      if (input.registrationDate !== undefined)
        updates.registration_date = input.registrationDate?.toISOString();

      updates.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return DocumentMapper.toDomain(result as DocumentDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Soft delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw new ApiError(500, error.code, error.message);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Archive document (update status)
   */
  async archiveDocument(documentId: string): Promise<Document> {
    return this.updateDocument(documentId, { status: 'archived' });
  }

  /**
   * Count documents in organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_deleted', false);

      if (error) throw new ApiError(500, error.code, error.message);
      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }
}

// Singleton instance
export const documentRepository = new DocumentRepository();
