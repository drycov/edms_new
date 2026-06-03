/**
 * Task Delegate Feature - React Query Hook
 *
 * Mutations for task delegation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { delegateTask } from '../api/task.api';
import { TaskDelegationForm } from '../model/types';
import { taskQueries } from '@/entities/task';

export const useDelegateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: TaskDelegationForm) => {
      return delegateTask(form);
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({
        queryKey: taskQueries.detail(task.id),
      });
      queryClient.invalidateQueries({ queryKey: taskQueries.lists() });
      if (task.assigneeId) {
        queryClient.invalidateQueries({
          queryKey: taskQueries.forUser(task.assigneeId),
        });
      }
    },
  });
};
