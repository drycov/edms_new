import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { formatDate } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { toast } from '@/shared/ui/toaster';
import { useApprovalTasks, useApproveTask } from './model/useApprovals';

export function ApprovalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState<Record<string, string>>({});

  const { data: tasks, isLoading } = useApprovalTasks();
  const approveTask = useApproveTask();

  const handleApprove = (taskId: string, approved: boolean) => {
    approveTask.mutate(
      {
        taskId,
        approved,
        commentText: comment[taskId],
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['approval-tasks'] });
          toast.success(t('common.success'), t('approvals.approve'));
          setComment((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('approvals.title')}</h1>
        <p className="text-gray-500 mt-1">{t('approvals.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : tasks?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircle className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">{t('approvals.allCaughtUp')}</p>
          <p className="text-sm">{t('approvals.noPending')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks?.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {task.workflow_run?.document?.title || 'Document'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {task.workflow_run?.document?.registration_number || t('documents.notRegistered')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {task.workflow_run?.workflow?.name || 'Workflow'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{t('approvals.pending')}</Badge>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(task.due_date)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <Textarea
                    value={comment[task.id] || ''}
                    onChange={(e) => setComment({ ...comment, [task.id]: e.target.value })}
                    placeholder={t('documents.comments')}
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    {t('common.created')}: {formatDate(task.created_at)}
                  </span>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/documents/${task.workflow_run?.document?.id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t('documents.documentDetails')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleApprove(task.id, false)}
                      disabled={approveTask.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('approvals.reject')}
                    </Button>
                    <Button
                      onClick={() => handleApprove(task.id, true)}
                      disabled={approveTask.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('approvals.approve')}
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
