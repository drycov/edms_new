import { supabase } from '@/shared/api/supabase';

import type {
  WorkflowNode,
  WorkflowConnection,
  WorkflowSettings,
} from '../model/types';

/**
 * INTERNAL HELPERS
 */
async function getOrganizationId() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile?.organization_id) throw new Error('No organization');

  return { user, organizationId: profile.organization_id };
}

/**
 * WORKFLOWS
 */
export const workflowApi = {
  /**
   * LIST
   */
  async getWorkflows() {
    const { organizationId } = await getOrganizationId();

    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * GET ONE
   */
  async getWorkflow(id: string) {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * CREATE
   */
  async createWorkflow(payload: WorkflowSettings) {
    const { user, organizationId } = await getOrganizationId();

    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
        description: payload.description,
        trigger_type: payload.trigger_type,
        default_sla_hours: payload.default_sla_hours,
        organization_id: organizationId,
        created_by: user.id,
        definition: {
          nodes: [],
          edges: [],
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * UPDATE SETTINGS
   */
  async updateWorkflow(id: string, payload: Partial<WorkflowSettings>) {
    const { error } = await supabase
      .from('workflows')
      .update({
        ...payload,
        name: payload.name?.trim(),
        code: payload.code?.trim().toUpperCase(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * DELETE
   */
  async deleteWorkflow(id: string) {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * NODES
   */
  async getNodes(workflowId: string) {
    const { data, error } = await supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at');

    if (error) throw error;
    return data as WorkflowNode[];
  },

  async createNode(
    workflowId: string,
    node: Omit<WorkflowNode, 'id' | 'workflow_id'>
  ) {
    const { error } = await supabase.from('workflow_nodes').insert({
      ...node,
      workflow_id: workflowId,
    });

    if (error) throw error;
  },

  async updateNode(id: string, data: Partial<WorkflowNode>) {
    const { error } = await supabase
      .from('workflow_nodes')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteNode(nodeId: string) {
    await supabase
      .from('workflow_connections')
      .delete()
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

    const { error } = await supabase
      .from('workflow_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) throw error;
  },

  /**
   * CONNECTIONS
   */
  async getConnections(workflowId: string) {
    const { data, error } = await supabase
      .from('workflow_connections')
      .select('*')
      .eq('workflow_id', workflowId);

    if (error) throw error;
    return data as WorkflowConnection[];
  },

  async createConnection(params: {
    workflowId: string;
    sourceId: string;
    targetId: string;
    condition_type?: string;
  }) {
    if (params.sourceId === params.targetId) return;

    const { error } = await supabase.from('workflow_connections').insert({
      workflow_id: params.workflowId,
      source_node_id: params.sourceId,
      target_node_id: params.targetId,
      condition_type: params.condition_type || 'always',
    });

    if (error) throw error;
  },

  async deleteConnection(id: string) {
    const { error } = await supabase
      .from('workflow_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};