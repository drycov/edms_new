import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflow, useUpdateWorkflow, useCreateWorkflowNode, useWorkflowNodes, useWorkflowConnections, useCreateWorkflowConnection, useDeleteWorkflowConnection } from '../../entities/workflow';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Badge } from '../../shared/ui/badge';
import {
  Save,
  Play,
  Settings,
  Plus,
  ArrowRight,
  Trash2,
  GripVertical,
  MousePointer,
} from 'lucide-react';
import { workflowNodeTypeLabels, workflowNodeTypeColors, type WorkflowNodeType } from '../../entities/workflow';

const nodeTypes: { type: WorkflowNodeType; label: string }[] = [
  { type: 'start', label: 'Start' },
  { type: 'approval', label: 'Approval' },
  { type: 'task', label: 'Task' },
  { type: 'condition', label: 'Condition' },
  { type: 'signature', label: 'Signature' },
  { type: 'notification', label: 'Notification' },
  { type: 'timer', label: 'Timer' },
  { type: 'archive', label: 'Archive' },
  { type: 'end', label: 'End' },
];

export function WorkflowDesignerPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: workflow } = useWorkflow(id!, !isNew);
  const { data: nodes } = useWorkflowNodes(id!);
  const { data: connections } = useWorkflowConnections(id!);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const updateWorkflow = useUpdateWorkflow();
  const createNode = useCreateWorkflowNode();
  const createConnection = useCreateWorkflowConnection();
  const deleteConnection = useDeleteWorkflowConnection();

  const handleAddNode = async (type: WorkflowNodeType) => {
    if (!id) return;

    const nodeKey = `${type}_${Date.now()}`;
    const newPosition = {
      x: 100 + Math.random() * 200,
      y: 100 + nodes?.length * 100 || 100,
    };

    await createNode.mutateAsync({
      workflow_id: id,
      node_key: nodeKey,
      name: workflowNodeTypeLabels[type],
      node_type: type,
      position_x: newPosition.x,
      position_y: newPosition.y,
    });
  };

  const handleConnect = async (sourceId: string, targetId: string) => {
    if (!id || sourceId === targetId) return;

    await createConnection.mutateAsync({
      workflow_id: id,
      source_node_id: sourceId,
      target_node_id: targetId,
      condition_type: 'always',
    });

    setIsConnecting(false);
    setConnectingFrom(null);
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!id) return;
    await deleteConnection.mutateAsync({ id: connectionId, workflow_id: id });
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'New Workflow' : workflow?.name || 'Workflow Designer'}
          </h1>
          {workflow && (
            <div className="flex items-center gap-2">
              {workflow.is_published ? (
                <Badge variant="success">Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              <Badge variant="outline">v{workflow.version}</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Simulate
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-64 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Node Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nodeTypes.map((nodeType) => (
                <button
                  key={nodeType.type}
                  onClick={() => handleAddNode(nodeType.type)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className={`h-6 w-6 rounded ${workflowNodeTypeColors[nodeType.type]}`} />
                  <span className="text-sm">{nodeType.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setIsConnecting(!isConnecting)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg ${
                  isConnecting ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                } text-left`}
              >
                <MousePointer className="h-4 w-4" />
                <span className="text-sm">Connect Nodes</span>
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 relative">
          <Card className="h-full">
            <CardContent className="h-full p-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gray-50">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {connections?.map((conn) => {
                  const source = nodes?.find((n) => n.id === conn.source_node_id);
                  const target = nodes?.find((n) => n.id === conn.target_node_id);

                  if (!source || !target) return null;

                  return (
                    <g key={conn.id}>
                      <line
                        x1={source.position_x + 80}
                        y1={source.position_y + 30}
                        x2={target.position_x + 80}
                        y2={target.position_y + 30}
                        stroke="#94a3b8"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                        className="cursor-pointer hover:stroke-red-500"
                        onClick={() => handleDeleteConnection(conn.id)}
                      />
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                      </defs>
                    </g>
                  );
                })}

                {nodes?.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => {
                      if (isConnecting) {
                        if (!connectingFrom) {
                          setConnectingFrom(node.id);
                        } else if (connectingFrom !== node.id) {
                          handleConnect(connectingFrom, node.id);
                        }
                      } else {
                        setSelectedNode(node.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: node.position_x,
                      top: node.position_y,
                    }}
                    className={`w-40 rounded-lg border-2 shadow-sm cursor-pointer transition-all ${
                      selectedNode === node.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isConnecting && connectingFrom === node.id ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`h-2 rounded-t-lg ${workflowNodeTypeColors[node.node_type as WorkflowNodeType]}`} />
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-900 truncate">{node.name}</p>
                      <p className="text-xs text-gray-500">{workflowNodeTypeLabels[node.node_type as WorkflowNodeType]}</p>
                    </div>
                  </div>
                ))}

                {nodes?.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <Plus className="h-12 w-12 mb-4" />
                    <p className="font-medium">No nodes yet</p>
                    <p className="text-sm">Click a node type to add it to the canvas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedNode && (
          <div className="w-72">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-sm">Node Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <Input
                      value={nodes?.find((n) => n.id === selectedNode)?.name || ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <Input
                      value={workflowNodeTypeLabels[nodes?.find((n) => n.id === selectedNode)?.node_type as WorkflowNodeType] || ''}
                      readOnly
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
