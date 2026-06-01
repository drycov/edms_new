import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';

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

// Hook to fetch document comments
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

      // Fetch replies for each comment
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
        })
      );

      return commentsWithReplies as Comment[];
    },
    enabled: !!documentId,
  });
}

// Hook to create comment
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
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('document_comments').insert({
        document_id: documentId,
        author_id: user.id,
        parent_id: parentId || null,
        content,
        position: position || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}

// Hook to update comment
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
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}

// Hook to delete comment
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
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}

// Hook to resolve comment
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
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('document_comments')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] });
    },
  });
}
