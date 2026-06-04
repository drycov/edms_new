import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { supabase } from '@/shared/api/supabase';
import { formatDate } from '@/shared/lib/utils';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_name: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

interface PermissionRole {
  role: string;
  permissions: string[];
  description: string;
}

const permissions: PermissionRole[] = [
  {
    role: 'admin',
    permissions: [
      'view_all_documents',
      'create_documents',
      'edit_documents',
      'delete_documents',
      'manage_workflows',
      'manage_users',
      'manage_permissions',
      'view_audit_logs',
      'export_data',
    ],
    description: 'Full system access',
  },
  {
    role: 'manager',
    permissions: [
      'view_all_documents',
      'create_documents',
      'edit_documents',
      'manage_workflows',
      'manage_users',
      'view_audit_logs',
    ],
    description: 'Manage documents and workflows',
  },
  {
    role: 'approver',
    permissions: [
      'view_all_documents',
      'approve_documents',
      'assign_tasks',
      'view_audit_logs',
    ],
    description: 'Approve and assign',
  },
  {
    role: 'contributor',
    permissions: ['create_documents', 'edit_own_documents', 'view_shared_documents'],
    description: 'Create and edit documents',
  },
  {
    role: 'viewer',
    permissions: ['view_shared_documents'],
    description: 'Read-only access',
  },
];

export function SecurityPage() {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const { profile } = await getCurrentUserOrganization();

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs(data as AuditLog[]);
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const actionColors: Record<string, string> = {
    created: 'bg-green-100 text-green-800',
    updated: 'bg-blue-100 text-blue-800',
    deleted: 'bg-red-100 text-red-800',
    viewed: 'bg-gray-100 text-gray-800',
  };

  const filteredLogs = auditLogs.filter((log) =>
    filter ? log.action.toLowerCase().includes(filter.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Audit</h1>
        <p className="text-gray-500 mt-1">Manage permissions and monitor system activity</p>
      </div>

      {/* Permissions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {permissions.map((role) => (
          <Card key={role.role}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{role.role}</CardTitle>
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500">{role.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {role.permissions.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700">{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Log</CardTitle>
            <input
              type="text"
              placeholder="Filter by action..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => {
                const actionType = log.action.split('_')[0];
                const actionColor =
                  actionColors[actionType] || 'bg-gray-100 text-gray-800';

                return (
                  <div key={log.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={actionColor}>{log.action}</Badge>
                          <span className="text-xs text-gray-600">{log.entity_type}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>{log.user_name}</strong> {log.action} {log.entity_type}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDate(log.created_at, 'relative')}
                        </p>
                      </div>
                      {log.new_values && (
                        <div className="text-xs text-gray-600 max-w-xs">
                          <details className="cursor-pointer">
                            <summary>Changes</summary>
                            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto text-xs">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
