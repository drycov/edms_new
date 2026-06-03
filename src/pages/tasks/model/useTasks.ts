import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

export function useTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { user } = await getCurrentUserOrganization();

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('assignee_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
