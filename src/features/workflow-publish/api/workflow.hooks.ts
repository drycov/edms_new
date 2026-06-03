/**
 * Workflow Publish Feature - React Query Hook
 *
 * Mutations for workflow publication
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishWorkflow } from '../api/workflow.api';
import { WorkflowPublishForm } from '../model/types';
import { workflowQueries } from '@/entities/workflow';

export const usePublishWorkflowMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: WorkflowPublishForm) => {
      return publishWorkflow(form);
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({
        queryKey: workflowQueries.detail(workflow.id),
      });
      queryClient.invalidateQueries({ queryKey: workflowQueries.lists() });
    },
  });
};
