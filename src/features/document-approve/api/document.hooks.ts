/**
 * Document Approve Feature - React Query Hook
 *
 * Mutations for document approval flow
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveDocument, rejectDocument } from '../api/document.api';
import { DocumentApprovalForm } from '../model/types';
import { documentQueries } from '@/entities/document';

export const useApproveDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: DocumentApprovalForm) => {
      return approveDocument(form);
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: documentQueries.detail(document.id),
      });
      queryClient.invalidateQueries({ queryKey: documentQueries.lists() });
    },
  });
};

export const useRejectDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason?: string }) => {
      return rejectDocument(documentId, reason);
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: documentQueries.detail(document.id),
      });
      queryClient.invalidateQueries({ queryKey: documentQueries.lists() });
    },
  });
};
