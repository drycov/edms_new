import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { formatDate } from '../../shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type Task = {
  id: string;
  task_type: string;
  status: string;
  due_date: string | null;
  created_at: string;
  workflow_run: {
    id: string;
    document: {
      id: string;
      title: string;
      registration_number: string | null;
    };
    workflow: {
      name: string;
    };
  };
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delegated: 'bg-gray-100 text-gray-800',
};

export function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(`
          id,
          task_type,
          status,
          due_date,
          created_at,
          workflow_run:workflow_runs(
            id,
            document:documents(
              id,
              title,
              registration_number
            ),
            workflow:workflows(name)
          )
        `)
        .eq('assignee_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: completedTasks } = useQuery({
    queryKey: ['completed-tasks'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(`
          id,
          task_type,
          status,
          completed_at,
          workflow_run:workflow_runs(
            id,
            document:documents(
              id,
              title,
              registration_number
            )
          )
        `)
        .eq('assignee_id', user.id)
        .in('status', ['completed', 'delegated'])
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'approval':
        return t('approvals.title');
      case 'signature':
        return t('workflows.signature');
      case 'review':
        return 'Review';
      case 'task':
        return t('workflows.task');
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('tasks.pending');
      case 'in_progress':
        return t('tasks.inProgress');
      case 'completed':
        return t('tasks.completed');
      case 'delegated':
        return t('tasks.delegated');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
        <p className="text-gray-500 mt-1">{t('tasks.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-gray-900">{t('tasks.pending')} ({tasks?.length || 0})</h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tasks?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mb-4 text-gray-300" />
                <p className="font-medium">{t('approvals.allCaughtUp')}</p>
                <p className="text-sm">{t('notifications.noNotifications')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks?.map((task) => (
                <Card
                  key={task.id}
                  className="hover:border-blue-300 cursor-pointer"
                  onClick={() => navigate(`/documents/${task.workflow_run?.document?.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {task.workflow_run?.document?.title || 'Document'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getTaskTypeLabel(task.task_type)} - {task.workflow_run?.workflow?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {task.due_date && new Date(task.due_date) < new Date() && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge className={statusColors[task.status]}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">{t('tasks.completed')}</h2>

          {completedTasks?.length === 0 ? (
            <Card>
              <CardContent className="py-4 text-center text-gray-500 text-sm">
                {t('common.none')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {completedTasks?.slice(0, 10).map((task: any) => (
                <Card key={task.id}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.workflow_run?.document?.title || 'Document'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.completed_at ? formatDate(task.completed_at) : '-'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
