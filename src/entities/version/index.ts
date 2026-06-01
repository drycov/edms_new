import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

// Hook to fetch document versions
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

// Hook to create a new version
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
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Get current document
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('version_number, title, description, content')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Create new version
      const newVersionNumber = (doc.version_number || 0) + 1;

      const { error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          version_number: newVersionNumber,
          content: doc.content,
          created_by: user.id,
          change_summary: changeSummary || `Version ${newVersionNumber}`,
        });

      if (versionError) throw versionError;

      // Update document
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

      return { versionNumber: newVersionNumber };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] });
    },
  });
}

// Hook to restore a version
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
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Get version content
      const { data: version, error: versionError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      // Create a new version with current content before restore
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

      // Restore content
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          content: version.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      return version;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] });
    },
  });
}

// Hook to compare two versions
export function useCompareVersions(
  documentId: string,
  versionId1: string | null,
  versionId2: string | null
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
