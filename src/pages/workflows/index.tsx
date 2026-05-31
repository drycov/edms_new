import { useNavigate } from 'react-router-dom';
import { Plus, GitBranch, Play, Settings } from 'lucide-react';
import { useWorkflows } from '../../entities/workflow';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { formatDate } from '../../shared/lib/utils';

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { data: workflows, isLoading } = useWorkflows();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 mt-1">Manage workflow definitions and automation</p>
        </div>
        <Button onClick={() => navigate('/workflows/designer')}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : workflows?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <GitBranch className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">No workflows yet</p>
          <p className="text-sm">Create your first workflow to automate processes</p>
          <Button className="mt-4" onClick={() => navigate('/workflows/designer')}>
            Create Workflow
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map((workflow) => (
            <Card
              key={workflow.id}
              className="hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/workflows/designer/${workflow.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    {workflow.is_published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                    {workflow.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{workflow.description || 'No description'}</p>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Code: {workflow.code}</span>
                  <span>v{workflow.version}</span>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDate(workflow.updated_at)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workflows/designer/${workflow.id}`);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
