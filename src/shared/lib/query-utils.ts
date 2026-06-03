import { UseQueryOptions, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function getCurrentUserOrganization() {
  const user = await getCurrentUser();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, department_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.organization_id) throw new Error('No organization');
  return { user, profile };
}

export function createQueryOptions<T>(
  queryKey: Array<string | number | boolean | null>,
  queryFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T>>,
): UseQueryOptions<T> {
  return {
    queryKey,
    queryFn,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  };
}

export function createMutationOptions<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  onSuccessCallback?: (data: TData, variables: TVariables) => void,
  options?: Partial<UseMutationOptions<TData, TError, TVariables>>,
): UseMutationOptions<TData, TError, TVariables> {
  const queryClient = useQueryClient();

  return {
    mutationFn,
    onSuccess: (data, variables) => {
      onSuccessCallback?.(data, variables);
      queryClient.invalidateQueries();
    },
    ...options,
  };
}

export async function createAuditLog(
  action: string,
  actionCategory: string,
  entityType: string,
  data?: any,
) {
  const { error } = await supabase.from('audit_logs').insert({
    action,
    action_category: actionCategory,
    entity_type: entityType,
    data: data || {},
  });

  if (error) throw error;
}
