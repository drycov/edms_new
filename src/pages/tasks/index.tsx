import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { formatDate } from '../../shared/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText, Play } from 'lucide-react';
import { taskStatusColors, taskStatusLabels } from '../../entities/workflow';

export function TasksPage() {
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

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
          workflow_run:workflow_runs(
            id,
            status,
            document_id,
            variables,
            workflow:workflows(name, code)
          )
        `)
        .eq('assignee_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data;
    },
  });

  const pendingTasks = tasks?.filter((t: any) => t.status === 'pending') || [];
  const inProgressTasks = tasks?.filter((t: any) => t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500 mt-1">Tasks assigned to you across all workflows</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingTasks.length}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressTasks.length}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedTasks.length}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">All Tasks</h2>
          <div className="grid gap-3">
            {tasks?.map((task: any) => (
              <Card key={task.id} className="hover:border-blue-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{task.node?.name}</p>
                        <p className="text-sm text-gray-500">
                          {task.workflow_run?.workflow?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={taskStatusColors[task.status]}>
                        {taskStatusLabels[task.status]}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatDate(task.created_at, 'relative')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
