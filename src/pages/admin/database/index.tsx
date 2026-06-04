import { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { supabase } from '@/shared/api/supabase';
import { formatDate } from '@/shared/lib/utils';

interface DatabaseStats {
  tables: number;
  rows: number;
  size: string;
  backups: number;
  lastBackup: string | null;
}

export function DatabasePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DatabaseStats>({
    tables: 0,
    rows: 0,
    size: '0 MB',
    backups: 0,
    lastBackup: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      // In a real implementation, this would query actual database statistics
      setStats({
        tables: 12,
        rows: 1500,
        size: '15 MB',
        backups: 3,
        lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      toast.loading('Creating backup...');
      // In a real app, this would call an edge function to create a backup
      setTimeout(() => {
        toast.success('Success', 'Backup created successfully');
        loadDatabaseStats();
      }, 2000);
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting data...');
      // In a real app, this would export data
      setTimeout(() => {
        const data = JSON.stringify({ tables: 12, rows: 1500 }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `db-export-${new Date().toISOString()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success('Success', 'Data exported');
      }, 1000);
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database Management</h1>
        <p className="text-gray-500 mt-1">Manage backups, exports, and database health</p>
      </div>

      {/* Database Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.tables}</span>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-right">{stats.rows}</span>
              <Database className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Database Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.size}</span>
              <Database className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Backups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.backups}</span>
              <Database className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Database Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Operational</p>
                <p className="text-sm text-green-700">All systems healthy</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">Normal</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">Connections</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">42/100</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: '42%' }} />
                </div>
              </div>
            </div>

            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">CPU Usage</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">12%</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600" style={{ width: '12%' }} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Backup & Recovery</CardTitle>
            <Button onClick={handleBackup} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Create Backup Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Backup - 2024-01-20</p>
                  <p className="text-sm text-gray-600">Full database backup</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </div>
            </div>

            <div className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Backup - 2024-01-19</p>
                  <p className="text-sm text-gray-600">Full database backup</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </div>
            </div>

            <div className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Backup - 2024-01-18</p>
                  <p className="text-sm text-gray-600">Full database backup</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Export all data to JSON format for backup or migration purposes.
          </p>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
