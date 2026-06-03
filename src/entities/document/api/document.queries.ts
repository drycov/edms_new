/**
 * Document Query Factories
 *
 * Centralized React Query hook definitions.
 * Eliminates duplicated query logic and ensures consistency.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentRepository } from './document.repository';
import type {
  Document,
  DocumentFilter,
  DocumentSort,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../model/document';
import { getCurrentUser, getCurrentUserOrganization } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';
import { authService, Permission } from '@/shared/lib/auth.service';

/**
 * Query key factory
 */
export const documentQueries = {
  all: () => ['documents'] as const,
  lists: () => [...documentQueries.all(), 'list'] as const,
  list: (filter: Partial<DocumentFilter>) =>
    [...documentQueries.lists(), filter] as const,
  details: () => [...documentQueries.all(), 'detail'] as const,
  detail: (id: string) => [...documentQueries.details(), id] as const,
  byOrganization: (orgId: string) =>
    [...documentQueries.all(), 'org', orgId] as const,
};

/**
 * Hooks for document queries and mutations
 */
export const useDocumentQueries = {
  /**
   * List documents with filters
   */
  useList: (filter: DocumentFilter, sort?: DocumentSort) => {
    return useQuery({
      queryKey: documentQueries.list(filter),
      queryFn: async () => {
        return documentRepository.findWithFilters(filter, sort);
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  },

  /**
   * Get single document by ID
   */
  useById: (id: string | null) => {
    return useQuery({
      queryKey: documentQueries.detail(id || ''),
      queryFn: async () => {
        if (!id) return null;
        return documentRepository.findById(id);
      },
      enabled: !!id,
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
  },

  /**
   * Get all documents in organization
   */
  useByOrganization: (organizationId: string) => {
    return useQuery({
      queryKey: documentQueries.byOrganization(organizationId),
      queryFn: async () => {
        return documentRepository.findByOrganization(organizationId);
      },
      staleTime: 1000 * 60 * 5,
    });
  },

  /**
   * Count documents
   */
  useCount: (organizationId: string) => {
    return useQuery({
      queryKey: ['documents-count', organizationId],
      queryFn: async () => {
        return documentRepository.countByOrganization(organizationId);
      },
      staleTime: 1000 * 60 * 5,
    });
  },
};

/**
 * Hooks for document mutations
 */
export const useDocumentMutations = {
  /**
   * Create new document
   */
  useCreate: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (input: CreateDocumentInput) => {
        const { user, profile } = await getCurrentUserOrganization();

        // Check permission
        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.CREATE_DOCUMENT
        );

        return documentRepository.createDocument(
          profile.organization_id,
          user.id,
          input
        );
      },
      onSuccess: async (document) => {
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: documentQueries.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: ['documents-count'],
        });

        // Log audit
        const { user, profile } = await getCurrentUserOrganization();
        await auditService.document(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.DOCUMENT_CREATED,
          document.id,
          { title: document.title }
        );
      },
    });
  },

  /**
   * Update document
   */
  useUpdate: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        documentId,
        input,
      }: {
        documentId: string;
        input: UpdateDocumentInput;
      }) => {
        const { user, profile } = await getCurrentUserOrganization();

        // Check permission
        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.EDIT_DOCUMENT
        );

        // Check document belongs to org
        const doc = await documentRepository.findById(documentId);
        if (!doc || doc.organizationId !== profile.organization_id) {
          throw new Error('Document not found or access denied');
        }

        return documentRepository.updateDocument(documentId, input);
      },
      onSuccess: async (document) => {
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: documentQueries.detail(document.id),
        });
        queryClient.invalidateQueries({
          queryKey: documentQueries.lists(),
        });

        // Log audit
        const { user, profile } = await getCurrentUserOrganization();
        await auditService.document(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.DOCUMENT_UPDATED,
          document.id,
          { title: document.title }
        );
      },
    });
  },

  /**
   * Delete document
   */
  useDelete: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (documentId: string) => {
        const { user, profile } = await getCurrentUserOrganization();

        // Check permission
        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.DELETE_DOCUMENT
        );

        // Get document first
        const doc = await documentRepository.findById(documentId);
        if (!doc || doc.organizationId !== profile.organization_id) {
          throw new Error('Document not found or access denied');
        }

        await documentRepository.deleteDocument(documentId);
        return doc;
      },
      onSuccess: async (document) => {
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: documentQueries.lists(),
        });
        queryClient.invalidateQueries({
          queryKey: ['documents-count'],
        });

        // Log audit
        const { user, profile } = await getCurrentUserOrganization();
        await auditService.document(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.DOCUMENT_DELETED,
          document.id
        );
      },
    });
  },

  /**
   * Archive document
   */
  useArchive: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (documentId: string) => {
        const { user, profile } = await getCurrentUserOrganization();

        const doc = await documentRepository.findById(documentId);
        if (!doc || doc.organizationId !== profile.organization_id) {
          throw new Error('Document not found or access denied');
        }

        return documentRepository.archiveDocument(documentId);
      },
      onSuccess: async (document) => {
        queryClient.invalidateQueries({
          queryKey: documentQueries.detail(document.id),
        });
        queryClient.invalidateQueries({
          queryKey: documentQueries.lists(),
        });

        const { user, profile } = await getCurrentUserOrganization();
        await auditService.document(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.DOCUMENT_ARCHIVED,
          document.id
        );
      },
    });
  },
};
