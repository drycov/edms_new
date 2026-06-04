import { useState, useEffect } from 'react';
import { Save, Bell, Lock, Mail, FileJson } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

interface SystemSettings {
  system_name: string;
  system_email: string;
  support_email: string;
  notifications_enabled: boolean;
  two_factor_enabled: boolean;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  session_timeout: number;
  max_upload_size: number;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SystemSettings>({
    system_name: 'EDMS System',
    system_email: 'noreply@edms.local',
    support_email: 'support@edms.local',
    notifications_enabled: true,
    two_factor_enabled: true,
    auto_backup_enabled: true,
    backup_frequency: 'daily',
    session_timeout: 3600,
    max_upload_size: 100,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // In a real app, this would load from database
      // For now, using default settings
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to database
      toast.success('Success', 'Settings saved');
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure global system settings</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
              <Input
                value={settings.system_name}
                onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System Email</label>
              <Input
                type="email"
                value={settings.system_email}
                onChange={(e) => setSettings({ ...settings, system_email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
            <Input
              type="email"
              value={settings.support_email}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (seconds)
              </label>
              <Input
                type="number"
                value={settings.session_timeout}
                onChange={(e) =>
                  setSettings({ ...settings, session_timeout: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500 mt-1">Default: 1 hour</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Upload Size (MB)
              </label>
              <Input
                type="number"
                value={settings.max_upload_size}
                onChange={(e) =>
                  setSettings({ ...settings, max_upload_size: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.two_factor_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, two_factor_enabled: e.target.checked })
                }
                className="rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-xs text-gray-600">Require 2FA for all users</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) =>
                setSettings({ ...settings, notifications_enabled: e.target.checked })
              }
              className="rounded"
            />
            <div>
              <p className="font-medium text-gray-900">Enable Notifications</p>
              <p className="text-xs text-gray-600">Send notifications for important events</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Backup Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.auto_backup_enabled}
              onChange={(e) =>
                setSettings({ ...settings, auto_backup_enabled: e.target.checked })
              }
              className="rounded"
            />
            <div>
              <p className="font-medium text-gray-900">Automatic Backups</p>
              <p className="text-xs text-gray-600">Enable automatic database backups</p>
            </div>
          </label>

          {settings.auto_backup_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Frequency
              </label>
              <select
                value={settings.backup_frequency}
                onChange={(e) =>
                  setSettings({ ...settings, backup_frequency: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
