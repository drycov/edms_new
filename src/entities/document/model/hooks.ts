import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/api/supabase';
import type { DocumentFilters, DocumentWithRelations } from './types';

const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          document_type:document_types(id, name, code),
          nomenclature_item:nomenclature_items(id, code, title),
          creator:profiles!documents_created_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.document_type_id && filters.document_type_id.length > 0) {
        query = query.in('document_type_id', filters.document_type_id);
      }

      if (filters.created_by && filters.created_by.length > 0) {
        query = query.in('created_by', filters.created_by);
      }

      if (filters.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }

      if (filters.is_deleted !== undefined) {
        query = query.eq('is_deleted', filters.is_deleted);
      } else {
        query = query.eq('is_deleted', false);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.created_at_from) {
        query = query.gte('created_at', filters.created_at_from);
      }

      if (filters.created_at_to) {
        query = query.lte('created_at', filters.created_at_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as DocumentWithRelations[];
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_type:document_types(id, name, code),
          nomenclature_item:nomenclature_items(id, code, title),
          creator:profiles!documents_created_by_fkey(id, full_name),
          workflow_run:workflow_runs(
            id,
            status,
            workflow_id,
            workflow:workflows(name)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return data as DocumentWithRelations | null;
    },
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      document_type_id?: string;
      nomenclature_item_id?: string;
      content?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: payload.title,
          description: payload.description,
          document_type_id: payload.document_type_id,
          nomenclature_item_id: payload.nomenclature_item_id,
          content: payload.content,
          metadata: payload.metadata || {},
          organization_id: (await supabase.auth.getUser()).data.user?.user_metadata?.organization_id,
          created_by: (await supabase.auth.getUser()).data.user?.id!,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      title?: string;
      description?: string;
      content?: string;
      metadata?: Record<string, unknown>;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}
