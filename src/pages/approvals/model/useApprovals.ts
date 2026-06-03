import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser } from '@/shared/lib/query-utils';
import type { ApprovalTask } from './types';

export function useApprovalTasks() {
  return useQuery({
    queryKey: ['approval-tasks'],
    queryFn: async () => {
      const user = await getCurrentUser();

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(`
          id,
          status,
          due_date,
          created_at,
          workflow_run:workflow_runs(
            id,
            document:documents(
              id,
              title,
              registration_number
            ),
            workflow:workflows(name)
          )
        `)
        .eq('assignee_id', user.id)
        .eq('task_type', 'approval')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ApprovalTask[];
    },
  });
}

export function useApproveTask() {
  return useMutation({
    mutationFn: async ({
      taskId,
      approved,
      commentText,
    }: {
      taskId: string;
      approved: boolean;
      commentText?: string;
    }) => {
      const user = await getCurrentUser();

      const { error: updateError } = await supabase
        .from('workflow_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          outcome: approved ? 'approved' : 'rejected',
          comment: commentText || null,
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      const { data: task } = await supabase
        .from('workflow_tasks')
        .select('workflow_run_id')
        .eq('id', taskId)
        .single();

      if (task) {
        await supabase.from('workflow_events').insert({
          workflow_run_id: task.workflow_run_id,
          event_type: approved ? 'task_approved' : 'task_rejected',
          data: { task_id: taskId, user_id: user.id, comment: commentText },
        });
      }
    },
  });
}
