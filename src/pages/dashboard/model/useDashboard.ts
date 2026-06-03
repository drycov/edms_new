import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { user, profile } = await getCurrentUserOrganization();

      const [
        documentsCount,
        workflowsCount,
        pendingTasks,
        recentDocuments,
        activeWorkflows,
      ] = await Promise.all([
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('is_deleted', false),
        supabase
          .from('workflow_runs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'running'),
        supabase
          .from('workflow_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('documents')
          .select('id, title, status, created_at, registration_number')
          .eq('organization_id', profile.organization_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('workflow_runs')
          .select(`
            id,
            status,
            created_at,
            workflow:workflows(name)
          `)
          .eq('status', 'running')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      return {
        documentsCount: documentsCount.count || 0,
        workflowsCount: workflowsCount.count || 0,
        pendingTasks: pendingTasks.count || 0,
        recentDocuments: recentDocuments.data || [],
        activeWorkflows: activeWorkflows.data || [],
      };
    },
  });
}
