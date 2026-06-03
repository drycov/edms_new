import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser, createAuditLog } from '@/shared/lib/query-utils';

export type Comment = {
  id: string;
  document_id: string;
  parent_id: string | null;
  content: string;
  position?: { page: number; x: number; y: number };
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    full_name: string;
    email: string;
  };
  replies?: Comment[];
};

export function useDocumentComments(documentId: string) {
  return useQuery({
    queryKey: ['document-comments', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          author:profiles!document_comments_author_id_fkey(id, full_name, email)
        `)
        .eq('document_id', documentId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('document_comments')
            .select(`
              *,
              author:profiles!document_comments_author_id_fkey(id, full_name, email)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            replies: replies || [],
          };
        }),
      );

      return commentsWithReplies as Comment[];
    },
    enabled: !!documentId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      content,
      parentId,
      position,
    }: {
      documentId: string;
      content: string;
      parentId?: string;
      position?: { page: number; x: number; y: number };
    }) => {
      const user = await getCurrentUser();

      const { error } = await supabase.from('document_comments').insert({
        document_id: documentId,
        author_id: user.id,
        parent_id: parentId || null,
        content,
        position: position || null,
      });

      if (error) throw error;

      await createAuditLog('comment_created', 'document', 'document_comment', {
        document_id: documentId,
        parent_id: parentId || null,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
      documentId,
    }: {
      commentId: string;
      content: string;
      documentId: string;
    }) => {
      const { error } = await supabase
        .from('document_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;

      await createAuditLog('comment_updated', 'document', 'document_comment', {
        comment_id: commentId,
        document_id: documentId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      documentId,
    }: {
      commentId: string;
      documentId: string;
    }) => {
      const { error } = await supabase.from('document_comments').delete().eq('id', commentId);

      if (error) throw error;

      await createAuditLog('comment_deleted', 'document', 'document_comment', {
        comment_id: commentId,
        document_id: documentId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}

export function useResolveComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      documentId,
    }: {
      commentId: string;
      documentId: string;
    }) => {
      const user = await getCurrentUser();

      const { error } = await supabase
        .from('document_comments')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', commentId);

      if (error) throw error;

      await createAuditLog('comment_resolved', 'document', 'document_comment', {
        comment_id: commentId,
        document_id: documentId,
        resolved_by: user.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}
