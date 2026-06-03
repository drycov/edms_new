import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser, createAuditLog } from '@/shared/lib/query-utils';

export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          created_by_user:profiles!document_versions_created_by_fkey(id, full_name, email)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      content,
      changeSummary,
    }: {
      documentId: string;
      content: string;
      changeSummary?: string;
    }) => {
      const user = await getCurrentUser();

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('version_number, title, description, content')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      const newVersionNumber = (doc.version_number || 0) + 1;

      const { error: versionError } = await supabase.from('document_versions').insert({
        document_id: documentId,
        version_number: newVersionNumber,
        content: doc.content,
        created_by: user.id,
        change_summary: changeSummary || `Version ${newVersionNumber}`,
      });

      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          content,
          version_number: newVersionNumber,
          version_label: `${newVersionNumber}.0`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      await createAuditLog('document_version_created', 'document', 'document_version', {
        document_id: documentId,
        version_number: newVersionNumber,
      });

      return { versionNumber: newVersionNumber };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] });
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      versionId,
    }: {
      documentId: string;
      versionId: string;
    }) => {
      const user = await getCurrentUser();

      const { data: version, error: versionError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      const { data: doc } = await supabase
        .from('documents')
        .select('version_number, content')
        .eq('id', documentId)
        .single();

      if (doc) {
        await supabase.from('document_versions').insert({
          document_id: documentId,
          version_number: (doc.version_number || 0) + 1,
          content: doc.content,
          created_by: user.id,
          change_summary: `Auto-save before restoring version ${version.version_number}`,
        });
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          content: version.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      await createAuditLog('document_version_restored', 'document', 'document_version', {
        document_id: documentId,
        version_id: versionId,
        version_number: version.version_number,
      });

      return version;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] });
    },
  });
}

export function useCompareVersions(
  documentId: string,
  versionId1: string | null,
  versionId2: string | null,
) {
  return useQuery({
    queryKey: ['compare-versions', documentId, versionId1, versionId2],
    queryFn: async () => {
      if (!versionId1 || !versionId2) return null;

      const [{ data: v1 }, { data: v2 }] = await Promise.all([
        supabase.from('document_versions').select('*').eq('id', versionId1).single(),
        supabase.from('document_versions').select('*').eq('id', versionId2).single(),
      ]);

      return {
        version1: v1,
        version2: v2,
      };
    },
    enabled: !!versionId1 && !!versionId2,
  });
}
