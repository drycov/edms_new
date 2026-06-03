/**
 * Task Query Factories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskRepository } from './task.repository';
import type { Task, TaskFilter, CreateTaskInput, CompleteTaskInput } from '../model/task';
import { getCurrentUser } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';

export const taskQueries = {
  all: () => ['tasks'] as const,
  lists: () => [...taskQueries.all(), 'list'] as const,
  list: (filter: TaskFilter) => [...taskQueries.lists(), filter] as const,
  details: () => [...taskQueries.all(), 'detail'] as const,
  detail: (id: string) => [...taskQueries.details(), id] as const,
  forUser: (userId: string) => [...taskQueries.all(), 'user', userId] as const,
};

export const useTaskQueries = {
  useList: (filter: TaskFilter) => {
    return useQuery({
      queryKey: taskQueries.list(filter),
      queryFn: async () => taskRepository.findWithFilters(filter),
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
    });
  },

  useById: (id: string | null) => {
    return useQuery({
      queryKey: taskQueries.detail(id || ''),
      queryFn: async () => {
        if (!id) return null;
        return taskRepository.findById(id);
      },
      enabled: !!id,
    });
  },

  useAssignedToUser: (userId: string) => {
    return useQuery({
      queryKey: taskQueries.forUser(userId),
      queryFn: async () => taskRepository.findAssignedToUser(userId),
      staleTime: 1000 * 60 * 2,
    });
  },

  useByWorkflowRun: (workflowRunId: string) => {
    return useQuery({
      queryKey: ['tasks-by-run', workflowRunId],
      queryFn: async () => taskRepository.findByWorkflowRun(workflowRunId),
      staleTime: 1000 * 60 * 5,
    });
  },

  useCountPending: (userId: string) => {
    return useQuery({
      queryKey: ['tasks-pending', userId],
      queryFn: async () => taskRepository.countPendingForUser(userId),
      staleTime: 1000 * 60 * 2,
      refetchInterval: 1000 * 60, // Refetch every minute
    });
  },
};

export const useTaskMutations = {
  useCreate: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (input: CreateTaskInput) => {
        return taskRepository.createTask(input);
      },
      onSuccess: async (task) => {
        queryClient.invalidateQueries({ queryKey: taskQueries.lists() });
        if (task.assigneeId) {
          queryClient.invalidateQueries({
            queryKey: taskQueries.forUser(task.assigneeId),
          });
        }

        const user = await getCurrentUser();
        await auditService.task(
          {
            userId: user.id,
            organizationId: '', // Would need to come from context
            timestamp: new Date().toISOString(),
          },
          AuditAction.TASK_ASSIGNED,
          task.id,
          { taskType: task.taskType }
        );
      },
    });
  },

  useComplete: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        taskId,
        input,
      }: {
        taskId: string;
        input: CompleteTaskInput;
      }) => {
        return taskRepository.completeTask(taskId, input);
      },
      onSuccess: async (task) => {
        queryClient.invalidateQueries({ queryKey: taskQueries.detail(task.id) });
        queryClient.invalidateQueries({ queryKey: taskQueries.lists() });
        if (task.assigneeId) {
          queryClient.invalidateQueries({
            queryKey: taskQueries.forUser(task.assigneeId),
          });
        }

        const user = await getCurrentUser();
        const action =
          task.outcome === 'approved'
            ? AuditAction.TASK_APPROVED
            : AuditAction.TASK_COMPLETED;

        await auditService.task(
          {
            userId: user.id,
            organizationId: '',
            timestamp: new Date().toISOString(),
          },
          action,
          task.id,
          { outcome: task.outcome }
        );
      },
    });
  },

  useAssign: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        taskId,
        assigneeId,
      }: {
        taskId: string;
        assigneeId: string;
      }) => {
        return taskRepository.assignTask(taskId, assigneeId);
      },
      onSuccess: async (task) => {
        queryClient.invalidateQueries({ queryKey: taskQueries.detail(task.id) });
        if (task.assigneeId) {
          queryClient.invalidateQueries({
            queryKey: taskQueries.forUser(task.assigneeId),
          });
        }
      },
    });
  },

  useDelegate: () => {
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
        return taskRepository.delegateTask(taskId, newAssigneeId, reason);
      },
      onSuccess: async (task) => {
        queryClient.invalidateQueries({ queryKey: taskQueries.detail(task.id) });
        if (task.assigneeId) {
          queryClient.invalidateQueries({
            queryKey: taskQueries.forUser(task.assigneeId),
          });
        }

        const user = await getCurrentUser();
        await auditService.task(
          {
            userId: user.id,
            organizationId: '',
            timestamp: new Date().toISOString(),
          },
          AuditAction.TASK_DELEGATED,
          task.id
        );
      },
    });
  },
};
