import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { supabase } from '@/shared/api/supabase';
import { formatDate } from '@/shared/lib/utils';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  success_count: number;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export function IntegrationsPage() {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    events: ['document_created', 'document_updated'] as string[],
  });
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const { profile } = await getCurrentUserOrganization();
      setOrganizationId(profile.organization_id);

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data as Webhook[]);
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
      toast.error('Error', 'Name and URL are required');
      return;
    }

    try {
      const { error } = await supabase.from('webhooks').insert({
        name: webhookForm.name,
        url: webhookForm.url,
        events: webhookForm.events,
        organization_id: organizationId,
        is_active: true,
        retry_count: 3,
        retry_delay_seconds: 60,
      });

      if (error) throw error;
      toast.success('Success', 'Webhook created');
      setOpenAdd(false);
      setWebhookForm({ name: '', url: '', events: ['document_created', 'document_updated'] });
      loadWebhooks();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);

      if (error) throw error;
      loadWebhooks();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;

    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Success', 'Webhook deleted');
      loadWebhooks();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied', 'URL copied to clipboard');
  };

  const eventOptions = [
    'document_created',
    'document_updated',
    'document_deleted',
    'workflow_started',
    'workflow_completed',
    'task_assigned',
    'task_completed',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-500 mt-1">Manage webhooks and third-party integrations</p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Integration Services */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
              <p className="text-sm text-gray-600">Database & Auth provider</p>
              <p className="text-xs text-gray-500 mt-2">Status: Operational</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
              <p className="text-sm text-gray-600">Configure SMTP settings</p>
              <p className="text-xs text-gray-500 mt-2">Status: Not configured</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">File Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
              <p className="text-sm text-gray-600">Supabase Storage</p>
              <p className="text-xs text-gray-500 mt-2">Status: Operational</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks ({webhooks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No webhooks configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-gray-900">{webhook.name}</p>
                        <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={webhook.url}
                          readOnly
                          size="sm"
                          className="flex-1 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyUrl(webhook.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {webhook.success_count} successes
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-red-600" />
                          {webhook.failure_count} failures
                        </span>
                        {webhook.last_triggered_at && (
                          <span>
                            Last: {formatDate(webhook.last_triggered_at, 'relative')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant={webhook.is_active ? 'outline' : 'default'}
                        onClick={() => handleToggle(webhook)}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Webhook Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                placeholder="e.g., Document notifications"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <Input
                type="url"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {eventOptions.map((event) => (
                  <label key={event} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={webhookForm.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWebhookForm({
                            ...webhookForm,
                            events: [...webhookForm.events, event],
                          });
                        } else {
                          setWebhookForm({
                            ...webhookForm,
                            events: webhookForm.events.filter((ev) => ev !== event),
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWebhook}>Create Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
