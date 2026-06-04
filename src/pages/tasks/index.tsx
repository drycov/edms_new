import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { formatDate } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTaskQueries } from '@/entities/task';
import { getCurrentUser } from '@/shared/lib/query-utils';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delegated: 'bg-gray-100 text-gray-800',
};

export function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.id);
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    })();
  }, []);

  const { data: tasks, isLoading } = useTaskQueries.useAssignedToUser(userId);

  const { data: completedTasks } = useTaskQueries.useList({
    status: 'completed',
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
                  onClick={() => navigate(`/documents/${task.workflowRunId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Task {task.taskType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getTaskTypeLabel(task.taskType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {task.dueDate && new Date(task.dueDate) < new Date() && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge className={statusColors[task.status]}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(task.dueDate)}
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
              {completedTasks?.slice(0, 10).map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Task {task.taskType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.completedAt ? formatDate(task.completedAt) : '-'}
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
