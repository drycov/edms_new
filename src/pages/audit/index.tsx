import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { Shield, Activity, Filter, Download } from 'lucide-react';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../shared/lib/utils';
import { useState } from 'react';

type AuditLog = {
  id: string;
  action: string;
  action_category: string;
  entity_type: string;
  entity_id: string | null;
  user_name: string | null;
  user_email: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export function AuditPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: data as AuditLog[], count: count || 0 };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: weekCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .gte('created_at', weekAgo.toISOString());

      const { data: topActions } = await supabase
        .from('audit_logs')
        .select('action')
        .eq('organization_id', profile.organization_id)
        .gte('created_at', weekAgo.toISOString())
        .limit(1000);

      const actionCounts: Record<string, number> = {};
      topActions?.forEach((a) => {
        actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
      });

      const topActionsList = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      return {
        weekCount: weekCount || 0,
        topActions: topActionsList,
      };
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'workflow':
        return 'bg-cyan-100 text-cyan-800';
      case 'signature':
        return 'bg-green-100 text-green-800';
      case 'user':
        return 'bg-amber-100 text-amber-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(10000);

    if (!data) return;

    const csv = [
      ['ID', 'Action', 'Category', 'Entity Type', 'Entity ID', 'User', 'Email', 'IP', 'Created At'],
      ...data.map((log: any) => [
        log.id,
        log.action,
        log.action_category,
        log.entity_type,
        log.entity_id || '',
        log.user_name || '',
        log.user_email || '',
        log.ip_address || '',
        log.created_at,
      ]),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('audit.title')}</h1>
          <p className="text-gray-500 mt-1">{t('audit.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('audit.export')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.weekCount || 0}</p>
                <p className="text-sm text-gray-500">Events this week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('audit.action')}
              </label>
              <Input
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder={t('audit.action')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('audit.category')}
              </label>
              <Input
                value={filters.entity_type}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                placeholder={t('audit.category')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.date')} from
              </label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.date')} to
              </label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('audit.timestamp')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('audit.action')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('audit.category')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('audit.entity')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('audit.user')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('audit.ipAddress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData?.data?.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-medium text-gray-900">{log.action}</span>
                      </td>
                      <td className="p-3">
                        <Badge className={getCategoryColor(log.action_category)}>
                          {log.action_category}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="text-gray-400 ml-1">({log.entity_id.slice(0, 8)}...)</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {log.user_name || log.user_email || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-400">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {auditData && auditData.count > pageSize && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, auditData.count)} of {auditData.count}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(page + 1) * pageSize >= auditData.count}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
