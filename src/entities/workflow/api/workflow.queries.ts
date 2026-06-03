/**
 * Workflow Query Factories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowRepository } from './workflow.repository';
import type { Workflow, WorkflowFilter, CreateWorkflowInput, UpdateWorkflowInput } from '../model/workflow';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';
import { authService, Permission } from '@/shared/lib/auth.service';

export const workflowQueries = {
  all: () => ['workflows'] as const,
  lists: () => [...workflowQueries.all(), 'list'] as const,
  list: (filter: Partial<WorkflowFilter>) =>
    [...workflowQueries.lists(), filter] as const,
  details: () => [...workflowQueries.all(), 'detail'] as const,
  detail: (id: string) => [...workflowQueries.details(), id] as const,
  byOrganization: (orgId: string) =>
    [...workflowQueries.all(), 'org', orgId] as const,
};

export const useWorkflowQueries = {
  useList: (filter: WorkflowFilter) => {
    return useQuery({
      queryKey: workflowQueries.list(filter),
      queryFn: async () => {
        return workflowRepository.findWithFilters(filter);
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    });
  },

  useById: (id: string | null) => {
    return useQuery({
      queryKey: workflowQueries.detail(id || ''),
      queryFn: async () => {
        if (!id) return null;
        return workflowRepository.findById(id);
      },
      enabled: !!id,
      staleTime: 1000 * 60 * 10,
    });
  },

  useByOrganization: (organizationId: string) => {
    return useQuery({
      queryKey: workflowQueries.byOrganization(organizationId),
      queryFn: async () => {
        return workflowRepository.findByOrganization(organizationId);
      },
      staleTime: 1000 * 60 * 5,
    });
  },

  useCount: (organizationId: string) => {
    return useQuery({
      queryKey: ['workflows-count', organizationId],
      queryFn: async () => {
        return workflowRepository.countByOrganization(organizationId);
      },
      staleTime: 1000 * 60 * 5,
    });
  },
};

export const useWorkflowMutations = {
  useCreate: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (input: CreateWorkflowInput) => {
        const { user, profile } = await getCurrentUserOrganization();

        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.CREATE_WORKFLOW
        );

        return workflowRepository.createWorkflow(
          profile.organization_id,
          user.id,
          input
        );
      },
      onSuccess: async (workflow) => {
        queryClient.invalidateQueries({ queryKey: workflowQueries.lists() });
        queryClient.invalidateQueries({ queryKey: ['workflows-count'] });

        const { user, profile } = await getCurrentUserOrganization();
        await auditService.workflow(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.WORKFLOW_CREATED,
          workflow.id,
          { name: workflow.name }
        );
      },
    });
  },

  useUpdate: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        workflowId,
        input,
      }: {
        workflowId: string;
        input: UpdateWorkflowInput;
      }) => {
        const { user, profile } = await getCurrentUserOrganization();

        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.EDIT_WORKFLOW
        );

        const workflow = await workflowRepository.findById(workflowId);
        if (!workflow || workflow.organizationId !== profile.organization_id) {
          throw new Error('Workflow not found or access denied');
        }

        return workflowRepository.updateWorkflow(workflowId, input);
      },
      onSuccess: async (workflow) => {
        queryClient.invalidateQueries({
          queryKey: workflowQueries.detail(workflow.id),
        });
        queryClient.invalidateQueries({ queryKey: workflowQueries.lists() });

        const { user, profile } = await getCurrentUserOrganization();
        await auditService.workflow(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.WORKFLOW_UPDATED,
          workflow.id
        );
      },
    });
  },

  usePublish: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (workflowId: string) => {
        const { user, profile } = await getCurrentUserOrganization();

        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.PUBLISH_WORKFLOW
        );

        return workflowRepository.publishWorkflow(workflowId);
      },
      onSuccess: async (workflow) => {
        queryClient.invalidateQueries({
          queryKey: workflowQueries.detail(workflow.id),
        });
        queryClient.invalidateQueries({ queryKey: workflowQueries.lists() });

        const { user, profile } = await getCurrentUserOrganization();
        await auditService.workflow(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.WORKFLOW_PUBLISHED,
          workflow.id
        );
      },
    });
  },

  useToggleActive: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        workflowId,
        isActive,
      }: {
        workflowId: string;
        isActive: boolean;
      }) => {
        return workflowRepository.toggleActive(workflowId, isActive);
      },
      onSuccess: async (workflow) => {
        queryClient.invalidateQueries({
          queryKey: workflowQueries.detail(workflow.id),
        });
        queryClient.invalidateQueries({ queryKey: workflowQueries.lists() });
      },
    });
  },

  useDelete: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (workflowId: string) => {
        const { user, profile } = await getCurrentUserOrganization();

        authService.assertPermission(
          {
            user: { ...user, role: user.role as any },
            organizationId: profile.organization_id,
          },
          Permission.DELETE_WORKFLOW
        );

        const workflow = await workflowRepository.findById(workflowId);
        if (!workflow || workflow.organizationId !== profile.organization_id) {
          throw new Error('Workflow not found or access denied');
        }

        await workflowRepository.deleteWorkflow(workflowId);
        return workflow;
      },
      onSuccess: async (workflow) => {
        queryClient.invalidateQueries({ queryKey: workflowQueries.lists() });

        const { user, profile } = await getCurrentUserOrganization();
        await auditService.workflow(
          {
            userId: user.id,
            organizationId: profile.organization_id,
            timestamp: new Date().toISOString(),
          },
          AuditAction.WORKFLOW_DELETED,
          workflow.id
        );
      },
    });
  },
};
