import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Textarea } from '../../shared/ui/textarea';
import { Badge } from '../../shared/ui/badge';
import { Select } from '../../shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../shared/ui/dialog';
import {
  Save,
  Play,
  Settings,
  Plus,
  Trash2,
  MousePointer,
  Copy,
  Send,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../shared/ui/toaster';

type WorkflowNodeType = 'start' | 'approval' | 'task' | 'condition' | 'signature' | 'notification' | 'timer' | 'archive' | 'parallel' | 'merge' | 'end';

type WorkflowNode = {
  id: string;
  workflow_id: string;
  node_key: string;
  name: string;
  node_type: WorkflowNodeType;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
};

type WorkflowConnection = {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  condition_type: string;
  condition_expression: Record<string, unknown> | null;
};

const nodeTypeConfig: Record<WorkflowNodeType, { label: string; color: string; icon: string }> = {
  start: { label: 'Start', color: 'bg-green-500', icon: '▶' },
  approval: { label: 'Approval', color: 'bg-blue-500', icon: '✓' },
  task: { label: 'Task', color: 'bg-purple-500', icon: '☐' },
  condition: { label: 'Condition', color: 'bg-yellow-500', icon: '⑂' },
  signature: { label: 'Signature', color: 'bg-indigo-500', icon: '✍' },
  notification: { label: 'Notification', color: 'bg-cyan-500', icon: '◉' },
  timer: { label: 'Timer', color: 'bg-orange-500', icon: '⏱' },
  archive: { label: 'Archive', color: 'bg-slate-500', icon: '📦' },
  parallel: { label: 'Parallel', color: 'bg-teal-500', icon: '⫢' },
  merge: { label: 'Merge', color: 'bg-teal-500', icon: '⫡' },
  end: { label: 'End', color: 'bg-red-500', icon: '■' },
};

export function WorkflowDesignerPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const isNew = !id;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Workflow settings
  const [workflowSettings, setWorkflowSettings] = useState({
    name: '',
    code: '',
    description: '',
    trigger_type: 'manual',
    default_sla_hours: 72,
  });

  // Node editing state
  const [nodeForm, setNodeForm] = useState({
    name: '',
    config: {} as Record<string, unknown>,
  });

  // Fetch workflow
  const { data: workflow } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
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
    enabled: !!id,
  });

  // Fetch nodes
  const { data: nodes } = useQuery({
    queryKey: ['workflow-nodes', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', id)
        .order('created_at');
      if (error) throw error;
      return data as WorkflowNode[];
    },
    enabled: !!id,
  });

  // Fetch connections
  const { data: connections } = useQuery({
    queryKey: ['workflow-connections', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('workflow_connections')
        .select('*')
        .eq('workflow_id', id);
      if (error) throw error;
      return data as WorkflowConnection[];
    },
    enabled: !!id,
  });

  // Fetch roles for assignment
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch users for assignment
  const { data: users } = useQuery({
    queryKey: ['organization-users'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Create workflow
  const createWorkflow = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: workflowSettings.name,
          code: workflowSettings.code,
          description: workflowSettings.description,
          trigger_type: workflowSettings.trigger_type,
          default_sla_hours: workflowSettings.default_sla_hours,
          organization_id: profile.organization_id,
          created_by: user.id,
          definition: { nodes: [], edges: [] },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      navigate(`/workflows/designer/${data.id}`);
      toast.success(t('common.success'), t('common.create'));
    },
  });

  // Update workflow
  const updateWorkflow = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase
        .from('workflows')
        .update({
          name: workflowSettings.name,
          code: workflowSettings.code,
          description: workflowSettings.description,
          trigger_type: workflowSettings.trigger_type,
          default_sla_hours: workflowSettings.default_sla_hours,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      toast.success(t('common.success'), t('common.save'));
    },
  });

  // Create node
  const createNode = useMutation({
    mutationFn: async (type: WorkflowNodeType) => {
      if (!id) return;

      // Calculate position
      const existingNodes = nodes || [];
      const maxX = existingNodes.reduce((max, n) => Math.max(max, n.position_x), 0);
      const position = {
        x: maxX + 200,
        y: 100 + Math.random() * 100,
      };

      const nodeKey = `${type}_${Date.now()}`;
      const label = nodeTypeConfig[type]?.label || type;

      const { error } = await supabase
        .from('workflow_nodes')
        .insert({
          workflow_id: id,
          node_key: nodeKey,
          name: label,
          node_type: type,
          position_x: position.x,
          position_y: position.y,
          config: {},
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-nodes', id] });
    },
  });

  // Update node
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

  // Delete node
  const deleteNode = useMutation({
    mutationFn: async (nodeId: string) => {
      // Delete connections first
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

  // Create connection
  const createConnection = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      if (!id || sourceId === targetId) return;

      // Check if connection already exists
      const exists = connections?.some(
        (c) => c.source_node_id === sourceId && c.target_node_id === targetId
      );
      if (exists) {
        toast.error(t('common.error'), 'Connection already exists');
        return;
      }

      const { error } = await supabase
        .from('workflow_connections')
        .insert({
          workflow_id: id,
          source_node_id: sourceId,
          target_node_id: targetId,
          condition_type: 'always',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-connections', id] });
      setIsConnecting(false);
      setConnectingFrom(null);
    },
  });

  // Delete connection
  const deleteConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('workflow_connections')
        .delete()
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-connections', id] });
      setSelectedConnection(null);
    },
  });

  // Publish workflow
  const publishWorkflow = useMutation({
    mutationFn: async () => {
      if (!id) return;

      // Validate workflow has start and end nodes
      const hasStart = nodes?.some((n) => n.node_type === 'start');
      const hasEnd = nodes?.some((n) => n.node_type === 'end');

      if (!hasStart || !hasEnd) {
        throw new Error('Workflow must have start and end nodes');
      }

      const { error } = await supabase
        .from('workflows')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      toast.success(t('common.success'), t('workflows.published'));
    },
  });

  // Handle node drag
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes?.find((n) => n.id === nodeId);
    if (!node) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggedNode(nodeId);
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedNode || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    updateNode.mutate({
      id: draggedNode,
      data: {
        position_x: Math.max(0, newX),
        position_y: Math.max(0, newY),
      },
    });
  }, [draggedNode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (isConnecting) {
      if (!connectingFrom) {
        setConnectingFrom(nodeId);
      } else if (connectingFrom !== nodeId) {
        createConnection.mutate({ sourceId: connectingFrom, targetId: nodeId });
      }
    } else {
      setSelectedNode(nodeId);
      setSelectedConnection(null);
      const node = nodes?.find((n) => n.id === nodeId);
      if (node) {
        setNodeForm({
          name: node.name,
          config: node.config || {},
        });
      }
    }
  }, [isConnecting, connectingFrom, nodes]);

  // Handle canvas click
  const handleCanvasClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedConnection(null);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectingFrom(null);
    }
  }, [isConnecting]);

  // Handle connection click
  const handleConnectionClick = useCallback((e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    setSelectedConnection(connectionId);
    setSelectedNode(null);
  }, []);

  // Get selected node data
  const selectedNodeData = nodes?.find((n) => n.id === selectedNode);

  // Handle save node
  const handleSaveNode = () => {
    if (!selectedNode) return;
    updateNode.mutate({
      id: selectedNode,
      data: {
        name: nodeForm.name,
        config: nodeForm.config,
      },
    });
    setShowNodeEditor(false);
  };

  // Save workflow
  const handleSave = () => {
    if (isNew) {
      if (!workflowSettings.name || !workflowSettings.code) {
        toast.error(t('common.error'), t('common.name') + ' required');
        return;
      }
      createWorkflow.mutate();
    } else {
      updateWorkflow.mutate();
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? t('workflows.newWorkflow') : workflow?.name || t('workflows.workflowDesigner')}
          </h1>
          {workflow && (
            <div className="flex items-center gap-2">
              {workflow.is_published ? (
                <Badge variant="success">{t('workflows.published')}</Badge>
              ) : (
                <Badge variant="secondary">{t('workflows.draft')}</Badge>
              )}
              <Badge variant="outline">v{workflow.version}</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            {t('admin.systemSettings')}
          </Button>
          {!isNew && !workflow?.is_published && (
            <Button variant="outline" onClick={() => publishWorkflow.mutate()}>
              <Send className="h-4 w-4 mr-2" />
              {t('workflows.published')}
            </Button>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Designer */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel - Node Types */}
        <div className="w-56 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('workflows.nodeTypes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {(Object.entries(nodeTypeConfig) as [WorkflowNodeType, typeof nodeTypeConfig.start][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => {
                    if (id) {
                      createNode.mutate(type);
                    } else {
                      toast.error(t('common.error'), 'Save workflow first');
                    }
                  }}
                  disabled={!id || createNode.isPending}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`h-6 w-6 rounded flex items-center justify-center text-white text-xs ${config.color}`}>
                    {config.icon}
                  </div>
                  <span className="text-sm">{config.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('workflows.tools')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <button
                onClick={() => {
                  setIsConnecting(!isConnecting);
                  setConnectingFrom(null);
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg ${
                  isConnecting ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                } text-left`}
              >
                <MousePointer className="h-4 w-4" />
                <span className="text-sm">{t('workflows.connectNodes')}</span>
              </button>
            </CardContent>
          </Card>

          {nodes && nodes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('workflows.tools')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                      selectedNode === node.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded ${nodeTypeConfig[node.node_type]?.color}`} />
                    <span className="text-sm truncate">{node.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Card className="h-full">
            <CardContent className="h-full p-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gray-50">
                {/* Grid */}
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Connections */}
                  {connections?.map((conn) => {
                    const source = nodes?.find((n) => n.id === conn.source_node_id);
                    const target = nodes?.find((n) => n.id === conn.target_node_id);
                    if (!source || !target) return null;

                    const x1 = source.position_x + 80;
                    const y1 = source.position_y + 30;
                    const x2 = target.position_x + 80;
                    const y2 = target.position_y + 30;

                    return (
                      <g key={conn.id}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={selectedConnection === conn.id ? '#ef4444' : '#94a3b8'}
                          strokeWidth="2"
                          strokeDasharray={selectedConnection === conn.id ? '5,5' : 'none'}
                          className="cursor-pointer"
                          onClick={(e) => handleConnectionClick(e, conn.id)}
                        />
                        <polygon
                          points={`${x2 - 10},${y2 - 5} ${x2},${y2} ${x2 - 10},${y2 + 5}`}
                          fill="#94a3b8"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes */}
                {nodes?.map((node) => (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => handleNodeClick(e, node.id)}
                    style={{
                      position: 'absolute',
                      left: node.position_x,
                      top: node.position_y,
                      cursor: draggedNode === node.id ? 'grabbing' : 'grab',
                    }}
                    className={`w-40 rounded-lg border-2 shadow-md transition-shadow ${
                      selectedNode === node.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isConnecting && connectingFrom === node.id ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`h-2 rounded-t-lg ${nodeTypeConfig[node.node_type]?.color}`} />
                    <div className="p-2 bg-white rounded-b-lg">
                      <p className="text-xs font-medium text-gray-900 truncate">{node.name}</p>
                      <p className="text-xs text-gray-500">{nodeTypeConfig[node.node_type]?.label}</p>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {(!nodes || nodes.length === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <Plus className="h-12 w-12 mb-4" />
                    <p className="font-medium">{t('workflows.noNodes')}</p>
                    <p className="text-sm">{t('workflows.addNodeHint')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connection hint */}
          {isConnecting && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
              {connectingFrom
                ? 'Click target node to connect'
                : 'Click source node to start connection'}
            </div>
          )}
        </div>

        {/* Right Panel - Properties */}
        {(selectedNode || selectedConnection) && (
          <div className="w-72 space-y-4 overflow-y-auto">
            {selectedNode && selectedNodeData && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t('workflows.nodeProperties')}</CardTitle>
                    <button
                      onClick={() => setShowNodeEditor(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('common.name')}</label>
                    <Input
                      value={selectedNodeData.name}
                      onChange={(e) => {
                        setNodeForm({ ...nodeForm, name: e.target.value });
                        updateNode.mutate({
                          id: selectedNode,
                          data: { name: e.target.value },
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('common.type')}</label>
                    <Input value={nodeTypeConfig[selectedNodeData.node_type]?.label || ''} disabled />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Key</label>
                    <Input value={selectedNodeData.node_key} disabled />
                  </div>

                  {/* Assignment config for approval/task/signature */}
                  {['approval', 'task', 'signature'].includes(selectedNodeData.node_type) && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Assignee Type</label>
                      <Select
                        value={(selectedNodeData.config?.assignee_type as string) || 'static'}
                        onChange={(e) => {
                          const newConfig = {
                            ...selectedNodeData.config,
                            assignee_type: e.target.value,
                          };
                          updateNode.mutate({
                            id: selectedNode,
                            data: { config: newConfig },
                          });
                        }}
                      >
                        <option value="static">Specific User</option>
                        <option value="initiator">Initiator</option>
                        <option value="role">By Role</option>
                      </Select>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600"
                    onClick={() => {
                      if (confirm(t('common.confirm'))) {
                        deleteNode.mutate(selectedNode);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {selectedConnection && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Connection</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600"
                    onClick={() => {
                      if (confirm(t('common.confirm'))) {
                        deleteConnection.mutate(selectedConnection);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.systemSettings')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.name')} *
              </label>
              <Input
                value={workflowSettings.name}
                onChange={(e) => setWorkflowSettings({ ...workflowSettings, name: e.target.value })}
                placeholder={t('common.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.code')} *
              </label>
              <Input
                value={workflowSettings.code}
                onChange={(e) => setWorkflowSettings({ ...workflowSettings, code: e.target.value.toUpperCase() })}
                placeholder="WF_001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.description')}
              </label>
              <Textarea
                value={workflowSettings.description}
                onChange={(e) => setWorkflowSettings({ ...workflowSettings, description: e.target.value })}
                placeholder={t('common.description')}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Type
              </label>
              <Select
                value={workflowSettings.trigger_type}
                onChange={(e) => setWorkflowSettings({ ...workflowSettings, trigger_type: e.target.value })}
              >
                <option value="manual">Manual</option>
                <option value="document_created">Document Created</option>
                <option value="document_registered">Document Registered</option>
                <option value="scheduled">Scheduled</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default SLA (hours)
              </label>
              <Input
                type="number"
                value={workflowSettings.default_sla_hours}
                onChange={(e) => setWorkflowSettings({ ...workflowSettings, default_sla_hours: parseInt(e.target.value) || 72 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => {
              handleSave();
              setShowSettingsDialog(false);
            }}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
