import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import type { NomenclatureForm } from './schema';

async function getContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!data?.organization_id) throw new Error('No organization');

  return { user, organizationId: data.organization_id };
}

export function useNomenclature() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['nomenclature'],
    queryFn: async () => {
      const { organizationId } = await getContext();

      const { data, error } = await supabase
        .from('nomenclature_items')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: NomenclatureForm & { parent_id: string | null }) => {
      const { user, organizationId } = await getContext();

      const { error } = await supabase.from('nomenclature_items').insert({
        ...payload,
        organization_id: organizationId,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nomenclature'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nomenclature_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nomenclature'] }),
  });

  const move = useMutation({
    mutationFn: async ({ id, parent_id }: { id: string; parent_id: string | null }) => {
      const { error } = await supabase
        .from('nomenclature_items')
        .update({ parent_id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nomenclature'] }),
  });

  return {
    ...query,
    create,
    remove,
    move,
  };
}