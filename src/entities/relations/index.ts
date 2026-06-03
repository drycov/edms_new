import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser, createAuditLog } from '@/shared/lib/query-utils';

export type DocumentRelation = {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relation_type: 'parent' | 'child' | 'related' | 'attachment' | 'amendment' | 'replacement';
  created_at: string;
  target_document?: {
    id: string;
    title: string;
    registration_number: string | null;
    status: string;
  };
  source_document?: {
    id: string;
    title: string;
    registration_number: string | null;
    status: string;
  };
};

export function useDocumentRelations(documentId: string) {
  return useQuery({
    queryKey: ['document-relations', documentId],
    queryFn: async () => {
      const [{ data: outgoing, error: outgoingError }, { data: incoming, error: incomingError }] = await Promise.all([
        supabase
          .from('document_relations')
          .select(`
            id,
            source_document_id,
            target_document_id,
            relation_type,
            created_at,
            target_document:documents!document_relations_target_document_id_fkey(
              id,
              title,
              registration_number,
              status
            )
          `)
          .eq('source_document_id', documentId),
        supabase
          .from('document_relations')
          .select(`
            id,
            source_document_id,
            target_document_id,
            relation_type,
            created_at,
            source_document:documents!document_relations_source_document_id_fkey(
              id,
              title,
              registration_number,
              status
            )
          `)
          .eq('target_document_id', documentId),
      ]);

      if (outgoingError) throw outgoingError;
      if (incomingError) throw incomingError;

      return {
        outgoing: (outgoing || []) as DocumentRelation[],
        incoming: (incoming || []) as DocumentRelation[],
      };
    },
    enabled: !!documentId,
  });
}

export function useCreateRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceDocumentId,
      targetDocumentId,
      relationType,
    }: {
      sourceDocumentId: string;
      targetDocumentId: string;
      relationType: DocumentRelation['relation_type'];
    }) => {
      const user = await getCurrentUser();

      const { data: existing } = await supabase
        .from('document_relations')
        .select('id')
        .eq('source_document_id', sourceDocumentId)
        .eq('target_document_id', targetDocumentId)
        .maybeSingle();

      if (existing) throw new Error('Relation already exists');

      const { error } = await supabase.from('document_relations').insert({
        source_document_id: sourceDocumentId,
        target_document_id: targetDocumentId,
        relation_type: relationType,
        created_by: user.id,
      });

      if (error) throw error;

      await createAuditLog('document_relation_created', 'document', 'document_relation', {
        source_document_id: sourceDocumentId,
        target_document_id: targetDocumentId,
        relation_type: relationType,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-relations', variables.sourceDocumentId] });
      queryClient.invalidateQueries({ queryKey: ['document-relations', variables.targetDocumentId] });
    },
  });
}

export function useDeleteRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ relationId }: { relationId: string }) => {
      const { error } = await supabase.from('document_relations').delete().eq('id', relationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-relations'] });
    },
  });
}

export function useSearchDocumentsForRelation(search: string, excludeId: string) {
  return useQuery({
    queryKey: ['search-documents-relation', search, excludeId],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      const { user, profile } = await import('@/shared/lib/query-utils').then((m) =>
        m.getCurrentUserOrganization(),
      );

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, registration_number, status')
        .eq('organization_id', profile.organization_id)
        .eq('is_deleted', false)
        .neq('id', excludeId)
        .or(`title.ilike.%${search}%,registration_number.ilike.%${search}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });
}
