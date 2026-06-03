/**
 * Document Create Feature - React Query Hook
 *
 * Mutations and queries for document creation flow
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDocument } from '../api/document.api';
import { DocumentCreateForm } from '../model/types';
import { documentQueries } from '@/entities/document';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser } from '@/shared/lib/query-utils';

export const useDocumentTypeQuery = () => {
  return useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('document_types')
        .select('id, name, code')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useNomenclatureItemQuery = () => {
  return useQuery({
    queryKey: ['nomenclature-items-select'],
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('nomenclature_items')
        .select('id, code, title')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useCreateDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: DocumentCreateForm) => {
      return createDocument(form);
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: documentQueries.lists() });
      queryClient.invalidateQueries({ queryKey: ['documents-count'] });
    },
  });
};
