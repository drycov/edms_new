import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
// import { Select } from '@/shared/ui/select';
// import { Badge } from '@/shared/ui/badge';

import {
//   Save,
  Settings,
//   Plus,
  Trash2,
  MousePointer,
  Send,
//   Play,
//   Pause,
} from 'lucide-react';

import { nodeTypeConfig } from '@/features/workflow-designer/model/constants';
import type {
  WorkflowNode,
  WorkflowConnection,
  WorkflowNodeType,
  WorkflowSettings,
} from '@/features/workflow-designer/model/types';

/**
 * DESIGNER PAGE
 */

export const nodeTypeEntries = Object.entries(nodeTypeConfig) as Array<
  [keyof typeof nodeTypeConfig, (typeof nodeTypeConfig)[keyof typeof nodeTypeConfig]]
>;

export function WorkflowDesignerPage() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;

//   const { t } = useTranslation();
//   const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  // -----------------------------
  // STATE
  // -----------------------------
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [connecting, setConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>({
    name: '',
    code: '',
    description: '',
    trigger_type: 'manual',
    default_sla_hours: 72,
  });

  const [nodeForm, setNodeForm] = useState({
    name: '',
    config: {} as Record<string, unknown>,
  });

  

  // -----------------------------
  // FETCH WORKFLOW
  // -----------------------------
  const { data: workflow } = useQuery({
    queryKey: ['workflow', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setWorkflowSettings({
          name: data.name,
          code: data.code,
          description: data.description || '',
          trigger_type: data.trigger_type || 'manual',
          default_sla_hours: data.default_sla_hours || 72,
        });
      }

      return data;
    },
  });

  // -----------------------------
  // FETCH NODES
  // -----------------------------
  const { data: nodes } = useQuery({
    queryKey: ['workflow-nodes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', id!)
        .order('created_at');

      if (error) throw error;
      return data as WorkflowNode[];
    },
  });

  // -----------------------------
  // FETCH CONNECTIONS
  // -----------------------------
  const { data: connections } = useQuery({
    queryKey: ['workflow-connections', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_connections')
        .select('*')
        .eq('workflow_id', id!);

      if (error) throw error;
      return data as WorkflowConnection[];
    },
  });

  // -----------------------------
  // MUTATIONS
  // -----------------------------

  const createNode = useMutation({
    mutationFn: async (type: WorkflowNodeType) => {
      if (!id) return;

      const maxX = (nodes || []).reduce((m, n) => Math.max(m, n.position_x), 0);

      const { error } = await supabase.from('workflow_nodes').insert({
        workflow_id: id,
        node_key: `${type}_${Date.now()}`,
        name: nodeTypeConfig[type].label,
        node_type: type,
        position_x: maxX + 200,
        position_y: 120 + Math.random() * 100,
        config: {},
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-nodes', id] });
    },
  });

  const updateNode = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<WorkflowNode> }) => {
      const { error } = await supabase
        .from('workflow_nodes')
        .update(payload.data)
        .eq('id', payload.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-nodes', id] });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (nodeId: string) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-nodes', id] });
      queryClient.invalidateQueries({ queryKey: ['workflow-connections', id] });
      setSelectedNode(null);
    },
  });

  const createConnection = useMutation({
    mutationFn: async (p: { sourceId: string; targetId: string }) => {
      if (!id || p.sourceId === p.targetId) return;

      const exists = connections?.some(
        (c) =>
          c.source_node_id === p.sourceId &&
          c.target_node_id === p.targetId
      );

      if (exists) {
        toast.error('Error', 'Connection already exists');
        return;
      }

      const { error } = await supabase.from('workflow_connections').insert({
        workflow_id: id,
        source_node_id: p.sourceId,
        target_node_id: p.targetId,
        condition_type: 'always',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-connections', id] });
      setConnecting(false);
      setConnectingFrom(null);
    },
  });

  // -----------------------------
  // DRAG LOGIC
  // -----------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedNode || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();

      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      updateNode.mutate({
        id: draggedNode,
        data: {
          position_x: Math.max(0, x),
          position_y: Math.max(0, y),
        },
      });
    },
    [draggedNode, dragOffset]
  );

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    const node = nodes?.find((n) => n.id === nodeId);
    if (!node) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    setDraggedNode(nodeId);
  };

  // -----------------------------
  // NODE CLICK / CONNECT
  // -----------------------------
  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (connecting) {
      if (!connectingFrom) {
        setConnectingFrom(nodeId);
      } else {
        createConnection.mutate({
          sourceId: connectingFrom,
          targetId: nodeId,
        });
      }
      return;
    }

    setSelectedNode(nodeId);
    setSelectedConnection(null);

    const node = nodes?.find((n) => n.id === nodeId);
    if (node) {
      setNodeForm({
        name: node.name,
        config: node.config || {},
      });
    }
  };

  // -----------------------------
  // UI HELPERS
  // -----------------------------
  const selectedNodeData = nodes?.find((n) => n.id === selectedNode);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">

      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-bold">
          {workflow?.name || 'Workflow Designer'}
        </h1>

        <div className="flex gap-2">
          <Button onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>

          {!isNew && (
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-4">

        {/* LEFT PANEL */}
        <div className="w-56 space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nodes</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {nodeTypeEntries.map(([type, cfg]) => (
                <button
                  key={type}
                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                  onClick={() => createNode.mutate(type)}
                  disabled={!id}
                >
                  <div className={`w-4 h-4 ${cfg.color}`} />
                  {cfg.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2">
              <Button
                variant={connecting ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setConnecting((v) => !v)}
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CANVAS */}
        <div
          ref={canvasRef}
          className="flex-1 relative bg-gray-50"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {nodes?.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => handleNodeClick(e, node.id)}
              style={{
                position: 'absolute',
                left: node.position_x,
                top: node.position_y,
              }}
              className="w-40 bg-white border rounded shadow cursor-grab"
            >
              <div className={`h-2 ${nodeTypeConfig[node.node_type].color}`} />
              <div className="p-2 text-xs">
                {node.name}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL */}
        {selectedNodeData && (
          <div className="w-72">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Node</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <Input
                  value={selectedNodeData.name}
                  onChange={(e) =>
                    updateNode.mutate({
                      id: selectedNodeData.id,
                      data: { name: e.target.value },
                    })
                  }
                />

                <Button
                  variant="destructive"
                  onClick={() => deleteNode.mutate(selectedNodeData.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}