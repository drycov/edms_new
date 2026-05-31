import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/api/supabase';
import type { Workflow, WorkflowRun, WorkflowTask, WorkflowNode, WorkflowConnection, WorkflowEvent } from './types';

const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  withNodes: (id: string) => [...workflowKeys.detail(id), 'nodes'] as const,
  runs: {
    all: ['workflow-runs'] as const,
    list: (filters?: Record<string, unknown>) => [...workflowKeys.runs.all, 'list', filters] as const,
    detail: (id: string) => [...workflowKeys.runs.all, 'detail', id] as const,
    events: (id: string) => [...workflowKeys.runs.detail(id), 'events'] as const,
  },
  tasks: {
    all: ['workflow-tasks'] as const,
    assigned: (userId: string) => [...workflowKeys.tasks.all, 'assigned', userId] as const,
    detail: (id: string) => [...workflowKeys.tasks.all, 'detail', id] as const,
  },
};

export function useWorkflows(filters?: { is_active?: boolean; is_published?: boolean }) {
  return useQuery({
    queryKey: workflowKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.is_published !== undefined) {
        query = query.eq('is_published', filters.is_published);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as Workflow[];
    },
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.withNodes(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          nodes:workflow_nodes(*),
          connections:workflow_connections(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return data as Workflow & { nodes: WorkflowNode[]; connections: WorkflowConnection[] } | null;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; code: string; description?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: payload.name,
          code: payload.code,
          description: payload.description,
          organization_id: user?.user_metadata?.organization_id,
          created_by: user?.id!,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      description?: string;
      is_published?: boolean;
      is_active?: boolean;
      default_sla_hours?: number;
      escalation_config?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('workflows')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useWorkflowNodes(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.withNodes(workflowId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data as WorkflowNode[];
    },
    enabled: !!workflowId,
  });
}

export function useCreateWorkflowNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workflow_id: string;
      node_key: string;
      name: string;
      node_type: string;
      position_x?: number;
      position_y?: number;
      config?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('workflow_nodes')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.withNodes(variables.workflow_id) });
    },
  });
}

export function useUpdateWorkflowNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      workflow_id,
      ...payload
    }: {
      id: string;
      workflow_id: string;
      name?: string;
      position_x?: number;
      position_y?: number;
      config?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('workflow_nodes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.withNodes(variables.workflow_id) });
    },
  });
}

export function useWorkflowConnections(workflowId: string) {
  return useQuery({
    queryKey: [...workflowKeys.detail(workflowId), 'connections'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_connections')
        .select('*')
        .eq('workflow_id', workflowId);

      if (error) throw error;

      return data as WorkflowConnection[];
    },
    enabled: !!workflowId,
  });
}

export function useCreateWorkflowConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workflow_id: string;
      source_node_id: string;
      target_node_id: string;
      condition_type?: string;
      condition_expression?: Record<string, unknown>;
      label?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from('workflow_connections')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.withNodes(variables.workflow_id) });
    },
  });
}

export function useDeleteWorkflowConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      workflow_id,
    }: {
      id: string;
      workflow_id: string;
    }) => {
      const { error } = await supabase
        .from('workflow_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.withNodes(variables.workflow_id) });
    },
  });
}

export function useWorkflowRuns(filters?: { workflow_id?: string; document_id?: string; status?: string }) {
  return useQuery({
    queryKey: workflowKeys.runs.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('workflow_runs')
        .select(`
          *,
          workflow:workflows(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (filters?.workflow_id) {
        query = query.eq('workflow_id', filters.workflow_id);
      }

      if (filters?.document_id) {
        query = query.eq('document_id', filters.document_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as WorkflowRun[];
    },
  });
}

export function useWorkflowRun(runId: string) {
  return useQuery({
    queryKey: workflowKeys.runs.detail(runId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          workflow:workflows(id, name, code, version)
        `)
        .eq('id', runId)
        .maybeSingle();

      if (error) throw error;

      return data as WorkflowRun | null;
    },
    enabled: !!runId,
  });
}

export function useStartWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflow_id,
      document_id,
      variables,
    }: {
      workflow_id: string;
      document_id?: string;
      variables?: Record<string, unknown>;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('workflow_runs')
        .insert({
          workflow_id,
          document_id,
          variables: variables || {},
          initiator_id: user?.id!,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs.all });
    },
  });
}

export function useWorkflowEvents(runId: string) {
  return useQuery({
    queryKey: workflowKeys.runs.events(runId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_events')
        .select('*')
        .eq('workflow_run_id', runId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data as WorkflowEvent[];
    },
    enabled: !!runId,
  });
}

export function useAssignedTasks(userId: string) {
  return useQuery({
    queryKey: workflowKeys.tasks.assigned(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(`
          *,
          node:workflow_nodes(
            id,
            name,
            node_key,
            node_type
          ),
          assignee:profiles(id, full_name, avatar_url, position),
          workflow_run:workflow_runs(
            id,
            status,
            document_id,
            workflow:workflows(name, code)
          )
        `)
        .eq('assignee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data as WorkflowTask[];
    },
    enabled: !!userId,
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      result,
      comment,
    }: {
      taskId: string;
      result: 'approved' | 'rejected' | 'signed' | 'completed';
      comment?: string;
    }) => {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .update({
          status: 'completed',
          result,
          comment,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: workflowKeys.runs.all });
    },
  });
}

export function useDelegatTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      toUserId,
      reason,
    }: {
      taskId: string;
      toUserId: string;
      reason?: string;
    }) => {
      const { data: currentTask } = await supabase
        .from('workflow_tasks')
        .select('delegation_chain, workflow_run_id, workflow_node_id')
        .eq('id', taskId)
        .single();

      const { data, error } = await supabase
        .from('workflow_tasks')
        .insert({
          workflow_run_id: currentTask?.workflow_run_id!,
          workflow_node_id: currentTask?.workflow_node_id!,
          assignee_id: toUserId,
          assignee_type: 'user',
          status: 'pending',
          delegated_from_task_id: taskId,
          delegation_chain: [...(currentTask?.delegation_chain || []), taskId],
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('workflow_tasks')
        .update({
          status: 'delegated',
          result: reason,
        })
        .eq('id', taskId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.tasks.all });
    },
  });
}
