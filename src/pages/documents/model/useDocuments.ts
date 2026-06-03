import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';
import type { Document, DocumentStatus } from './types';

export function useDocuments(search: string, statusFilter: DocumentStatus | '') {
  return useQuery({
    queryKey: ['documents', search, statusFilter],
    queryFn: async () => {
      const { profile } = await getCurrentUserOrganization();

      let query = supabase
        .from('documents')
        .select(`
          id,
          title,
          description,
          status,
          registration_number,
          registration_date,
          version_label,
          created_at,
          document_type:document_types(name)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });
}
