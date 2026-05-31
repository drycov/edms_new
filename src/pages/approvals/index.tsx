import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { formatDate } from '../../shared/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, User, FileText } from 'lucide-react';
import { taskStatusColors, taskStatusLabels } from '../../entities/workflow';

export function ApprovalsPage() {
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['approvals'],
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
          assignee:profiles(id, full_name, avatar_url, position),
          workflow_run:workflow_runs(
            id,
            status,
            document_id,
            workflow:workflows(name, code)
          )
        `)
        .eq('assignee_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-gray-500 mt-1">Documents waiting for your approval</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tasks?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircle className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No pending approvals</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks?.map((task: any) => (
            <Card key={task.id} className="hover:border-blue-300 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{task.node?.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {task.workflow_run?.workflow?.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(task.created_at, 'relative')}
                        </span>
                        {task.due_date && (
                          <span className={new Date(task.due_date) < new Date() ? 'text-red-500' : ''}>
                            Due: {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${taskStatusColors[task.status]}`}>
                      {taskStatusLabels[task.status]}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Reject
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Approve
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
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
