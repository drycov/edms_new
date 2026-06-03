import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser, getCurrentUserOrganization, createAuditLog } from '@/shared/lib/query-utils';

export function useDelegateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newAssigneeId,
      reason,
    }: {
      taskId: string;
      newAssigneeId: string;
      reason?: string;
    }) => {
      const user = await getCurrentUser();

      const { data: task, error: taskError } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const { error: updateError } = await supabase
        .from('workflow_tasks')
        .update({
          assignee_id: newAssigneeId,
          status: 'delegated',
          delegated_from: user.id,
          delegation_reason: reason || null,
          delegated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      await supabase.from('workflow_events').insert({
        workflow_run_id: task.workflow_run_id,
        event_type: 'task_delegated',
        data: {
          task_id: taskId,
          from_user: user.id,
          to_user: newAssigneeId,
          reason,
        },
      });

      await createAuditLog('task_delegated', 'workflow', 'workflow_task', {
        task_id: taskId,
        from_user: user.id,
        to_user: newAssigneeId,
        reason,
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useReassignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newAssigneeId,
      reason,
    }: {
      taskId: string;
      newAssigneeId: string;
      reason?: string;
    }) => {
      const user = await getCurrentUser();

      const { data: task, error: taskError } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const { error } = await supabase
        .from('workflow_tasks')
        .update({
          assignee_id: newAssigneeId,
          reassigned_by: user.id,
          reassignment_reason: reason || null,
          reassigned_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      await supabase.from('workflow_events').insert({
        workflow_run_id: task.workflow_run_id,
        event_type: 'task_reassigned',
        data: {
          task_id: taskId,
          reassigned_by: user.id,
          new_assignee: newAssigneeId,
          reason,
        },
      });

      await createAuditLog('task_reassigned', 'workflow', 'workflow_task', {
        task_id: taskId,
        reassigned_by: user.id,
        new_assignee: newAssigneeId,
        reason,
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

export function useDelegatableUsers() {
  return useQuery({
    queryKey: ['delegatable-users'],
    queryFn: async () => {
      const { user, profile } = await getCurrentUserOrganization();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, position')
        .eq('organization_id', profile.organization_id)
        .neq('id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });
}
