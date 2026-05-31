import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Get workflow definition with nodes and connections
async function getWorkflowDefinition(workflowId: string) {
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (workflowError) throw workflowError;

  const { data: nodes, error: nodesError } = await supabase
    .from('workflow_nodes')
    .select('*')
    .eq('workflow_id', workflowId);

  if (nodesError) throw nodesError;

  const { data: connections, error: connectionsError } = await supabase
    .from('workflow_connections')
    .select('*')
    .eq('workflow_id', workflowId);

  if (connectionsError) throw connectionsError;

  return { workflow, nodes: nodes || [], connections: connections || [] };
}

// Get start node from workflow
function getStartNode(nodes: any[]): any | null {
  return nodes.find(n => n.node_type === 'start') || null;
}

// Evaluate condition expression
function evaluateCondition(expression: any, variables: Record<string, unknown>): boolean {
  try {
    const field = expression.field as string;
    const operator = expression.operator as string;
    const value = expression.value;
    const fieldValue = variables[field];

    switch (operator) {
      case 'equals': return fieldValue === value;
      case 'not_equals': return fieldValue !== value;
      case 'greater_than': return Number(fieldValue) > Number(value);
      case 'less_than': return Number(fieldValue) < Number(value);
      case 'contains': return String(fieldValue).includes(String(value));
      default: return true;
    }
  } catch {
    return true;
  }
}

// Get next nodes based on conditions
async function getNextNodes(
  currentNodeId: string,
  connections: any[],
  nodes: any[],
  variables: Record<string, unknown>
): Promise<any[]> {
  const outgoing = connections.filter(c => c.source_node_id === currentNodeId);
  const nextNodes: any[] = [];

  for (const conn of outgoing) {
    const targetNode = nodes.find(n => n.id === conn.target_node_id);
    if (!targetNode) continue;

    if (conn.condition_type === 'expression' && conn.condition_expression) {
      if (!evaluateCondition(conn.condition_expression, variables)) continue;
    }

    nextNodes.push(targetNode);
  }

  return nextNodes;
}

// Resolve assignee for a task node
async function resolveAssignee(node: any, run: any): Promise<string | null> {
  const config = node.config || {};

  switch (config.assignee_type) {
    case 'static':
      return config.assignee_id || null;
    case 'initiator':
      return run.initiator_id;
    case 'role':
      if (config.role_id) {
        const { data } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role_id', config.role_id)
          .limit(1)
          .maybeSingle();
        return data?.user_id || null;
      }
      return null;
    case 'department':
      if (config.department_id) {
        const { data } = await supabase
          .from('departments')
          .select('head_user_id')
          .eq('id', config.department_id)
          .maybeSingle();
        return data?.head_user_id || null;
      }
      return null;
    case 'dynamic':
      if (config.assignee_expression) {
        return run.variables[config.assignee_expression] as string || null;
      }
      return null;
    default:
      return null;
  }
}

// Send notification to user
async function sendNotification(
  userId: string | null,
  node: any,
  run: any
): Promise<void> {
  if (!userId) return;

  const { data: runData } = await supabase
    .from('workflow_runs')
    .select(`
      workflow:workflows(organization_id)
    `)
    .eq('id', run.id)
    .maybeSingle();

  await supabase.from('notifications').insert({
    organization_id: (runData as any)?.workflow?.organization_id,
    user_id: userId,
    notification_type: node.node_type === 'approval' ? 'approval_required' :
      node.node_type === 'signature' ? 'signature_required' : 'info',
    title: `Task: ${node.name}`,
    message: `You have a new task in the workflow`,
    entity_type: 'workflow_task',
    action_url: `/tasks`,
  });
}

// Execute a single node
async function executeNode(
  node: any,
  run: any,
  nodes: any[],
  connections: any[]
): Promise<{ nextNodes: any[]; shouldWait: boolean }> {
  let shouldWait = false;
  let nextNodes: any[] = [];

  // Log node entry
  await supabase.from('workflow_events').insert({
    workflow_run_id: run.id,
    event_type: 'node_entered',
    node_id: node.id,
    node_key: node.node_key,
    actor_id: run.initiator_id,
    data: { node_type: node.node_type, node_name: node.name },
  });

  switch (node.node_type) {
    case 'start':
      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      break;

    case 'end':
      await supabase
        .from('workflow_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          current_nodes: [],
          current_node_ids: [],
        })
        .eq('id', run.id);

      await supabase.from('workflow_events').insert({
        workflow_run_id: run.id,
        event_type: 'completed',
        actor_id: run.initiator_id,
        data: { message: 'Workflow completed successfully' },
      });

      return { nextNodes: [], shouldWait: false };

    case 'approval':
    case 'task':
    case 'signature':
      const assigneeId = await resolveAssignee(node, run);

      const { data: existingTask } = await supabase
        .from('workflow_tasks')
        .select('id')
        .eq('workflow_run_id', run.id)
        .eq('workflow_node_id', node.id)
        .maybeSingle();

      if (!existingTask) {
        await supabase.from('workflow_tasks').insert({
          workflow_run_id: run.id,
          workflow_node_id: node.id,
          assignee_id: assigneeId,
          assignee_type: node.config?.assignee_type || 'user',
          status: 'pending',
          due_date: node.config?.due_date
            ? new Date(Date.now() + Number(node.config.due_date) * 3600000).toISOString()
            : null,
        });

        await sendNotification(assigneeId, node, run);
      }

      shouldWait = true;
      break;

    case 'notification':
      const notifyUserId = await resolveAssignee(node, run);
      await sendNotification(notifyUserId, node, run);

      await supabase.from('workflow_events').insert({
        workflow_run_id: run.id,
        event_type: 'notification_sent',
        node_id: node.id,
        data: { sent_to: notifyUserId },
      });

      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      break;

    case 'condition':
      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      break;

    case 'timer':
      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      break;

    case 'archive':
      if (run.document_id) {
        await supabase
          .from('documents')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archive_reason: 'Workflow completed',
          })
          .eq('id', run.document_id);
      }

      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      break;

    case 'parallel':
      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      break;

    case 'merge':
      const incoming = connections.filter(c => c.target_node_id === node.id);
      const completed = await Promise.all(
        incoming.map(async (conn) => {
          const { data } = await supabase
            .from('workflow_events')
            .select('id')
            .eq('workflow_run_id', run.id)
            .eq('event_type', 'node_completed')
            .eq('node_id', conn.source_node_id)
            .maybeSingle();
          return !!data;
        })
      );

      if (completed.every(Boolean)) {
        nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
      } else {
        shouldWait = true;
      }
      break;

    default:
      nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);
  }

  // Log node completion
  await supabase.from('workflow_events').insert({
    workflow_run_id: run.id,
    event_type: 'node_completed',
    node_id: node.id,
    node_key: node.node_key,
    actor_id: run.initiator_id,
    data: { should_wait: shouldWait },
  });

  return { nextNodes, shouldWait };
}

// Execute workflow from a specific node
async function executeFromNode(runId: string, nodeId: string): Promise<void> {
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (runError || !run) throw runError || new Error('Run not found');

  const { nodes, connections } = await getWorkflowDefinition(run.workflow_id);
  const node = nodes.find(n => n.id === nodeId);

  if (!node) throw new Error('Node not found');

  const { nextNodes, shouldWait } = await executeNode(node, run, nodes, connections);

  if (!shouldWait && nextNodes.length > 0 && run.status === 'running') {
    const currentNodeKeys = nextNodes.map(n => n.node_key);
    const currentNodeIds = nextNodes.map(n => n.id);

    await supabase
      .from('workflow_runs')
      .update({
        current_nodes: currentNodeKeys,
        current_node_ids: currentNodeIds,
      })
      .eq('id', runId);

    for (const nextNode of nextNodes) {
      await executeFromNode(runId, nextNode.id);
    }
  }
}

// Start a new workflow run
async function startWorkflow(
  workflowId: string,
  documentId: string | null,
  variables: Record<string, unknown>,
  initiatorId: string
): Promise<string> {
  const { workflow, nodes, connections } = await getWorkflowDefinition(workflowId);

  if (!workflow.is_published) {
    throw new Error('Workflow is not published');
  }

  const slaDeadline = workflow.default_sla_hours
    ? new Date(Date.now() + workflow.default_sla_hours * 3600000).toISOString()
    : null;

  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflowId,
      document_id: documentId,
      variables,
      initiator_id: initiatorId,
      status: 'running',
      started_at: new Date().toISOString(),
      sla_deadline: slaDeadline,
    })
    .select()
    .single();

  if (runError) throw runError;

  await supabase.from('workflow_events').insert({
    workflow_run_id: run.id,
    event_type: 'started',
    actor_id: initiatorId,
    data: { workflow_id: workflowId, document_id: documentId },
  });

  const startNode = getStartNode(nodes);
  if (!startNode) {
    throw new Error('Workflow has no start node');
  }

  await supabase
    .from('workflow_runs')
    .update({
      current_nodes: [startNode.node_key],
      current_node_ids: [startNode.id],
    })
    .eq('id', run.id);

  await executeFromNode(run.id, startNode.id);

  return run.id;
}

// Complete a task and continue workflow
async function completeTask(
  taskId: string,
  result: string,
  comment: string | null,
  actorId: string
): Promise<void> {
  const { data: task, error: taskError } = await supabase
    .from('workflow_tasks')
    .select(`
      *,
      workflow_run:workflow_runs(
        id,
        workflow_id,
        variables,
        status
      )
    `)
    .eq('id', taskId)
    .single();

  if (taskError || !task) throw taskError || new Error('Task not found');

  const run = (task as any).workflow_run;

  await supabase
    .from('workflow_tasks')
    .update({
      status: 'completed',
      result,
      comment,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  await supabase.from('workflow_events').insert({
    workflow_run_id: run.id,
    event_type: 'task_completed',
    node_id: task.workflow_node_id,
    actor_id: actorId,
    data: { result, comment, task_id: taskId },
  });

  if (result === 'approved' || result === 'rejected') {
    const variables = {
      ...run.variables,
      [`node_${task.workflow_node_id}_result`]: result
    };
    await supabase
      .from('workflow_runs')
      .update({ variables })
      .eq('id', run.id);
  }

  const { nodes, connections } = await getWorkflowDefinition(run.workflow_id);
  const node = nodes.find(n => n.id === task.workflow_node_id);

  if (node) {
    const nextNodes = await getNextNodes(node.id, connections, nodes, run.variables);

    if (nextNodes.length > 0) {
      const currentNodeKeys = nextNodes.map(n => n.node_key);
      const currentNodeIds = nextNodes.map(n => n.id);

      await supabase
        .from('workflow_runs')
        .update({
          current_nodes: currentNodeKeys,
          current_node_ids: currentNodeIds,
        })
        .eq('id', run.id);

      for (const nextNode of nextNodes) {
        await executeFromNode(run.id, nextNode.id);
      }
    }
  }
}

// HTTP Handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/workflow-engine', '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    let response;

    if (req.method === 'POST' && path === '/start') {
      const body = await req.json();
      const runId = await startWorkflow(
        body.workflow_id,
        body.document_id || null,
        body.variables || {},
        user.id
      );
      response = { success: true, run_id: runId };
    } else if (req.method === 'POST' && path === '/task/complete') {
      const body = await req.json();
      await completeTask(
        body.task_id,
        body.result,
        body.comment || null,
        user.id
      );
      response = { success: true };
    } else if (req.method === 'GET' && path.startsWith('/status/')) {
      const runId = path.replace('/status/', '');
      const { data, error } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          events:workflow_events(*),
          tasks:workflow_tasks(*)
        `)
        .eq('id', runId)
        .single();

      if (error) throw error;
      response = data;
    } else {
      response = { error: 'Not found' };
    }

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
