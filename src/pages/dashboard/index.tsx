import { FileText, GitBranch, CheckSquare, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { formatDate, formatNumber } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from './model/useDashboard';

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useDashboardStats();

  const statCards = [
    {
      titleKey: 'dashboard.totalDocuments',
      value: stats?.documentsCount || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      titleKey: 'dashboard.activeWorkflows',
      value: stats?.workflowsCount || 0,
      icon: GitBranch,
      color: 'bg-cyan-500',
    },
    {
      titleKey: 'dashboard.pendingTasks',
      value: stats?.pendingTasks || 0,
      icon: CheckSquare,
      color: 'bg-amber-500',
    },
    {
      titleKey: 'dashboard.slaCompliance',
      value: '98.5%',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.titleKey}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t(stat.titleKey)}</p>
                  <p className="text-2xl font-bold mt-1">
                    {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('dashboard.recentDocuments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentDocuments.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('documents.noDocuments')}</p>
              ) : (
                stats?.recentDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <p className="text-sm text-gray-500">
                        {doc.registration_number || t('documents.notRegistered')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={doc.status === 'draft' ? 'secondary' : 'default'}>
                        {doc.status}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {t('dashboard.workflowStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.activeWorkflows.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('workflows.inactive')}</p>
              ) : (
                stats?.activeWorkflows.map((run: any) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{run.workflow?.name || 'Workflow'}</p>
                      <p className="text-sm text-gray-500">{formatDate(run.created_at, 'relative')}</p>
                    </div>
                    <Badge variant="default">{run.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('dashboard.slaStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-700">45</p>
                  <p className="text-sm text-green-600">{t('dashboard.onTrack')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-700">12</p>
                  <p className="text-sm text-amber-600">{t('dashboard.atRisk')}</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-700">3</p>
                  <p className="text-sm text-red-600">{t('dashboard.overdue')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
