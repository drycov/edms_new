import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Plus, GitBranch, Settings, Trash2, Play, Pause } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/shared/ui/toaster';

type Workflow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  version: number;
  is_published: boolean;
  is_active: boolean;
  trigger_type: string;
  created_at: string;
  updated_at: string;
};

export function WorkflowsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    trigger_type: 'manual',
  });

  /**
   * FETCH WORKFLOWS
   */
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Workflow[];
    },
  });

  /**
   * CREATE WORKFLOW
   */
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: payload.name.trim(),
          code: payload.code.trim().toUpperCase(),
          description: payload.description,
          trigger_type: payload.trigger_type,
          organization_id: profile.organization_id,
          created_by: user.id,
          definition: { nodes: [], edges: [] },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setOpen(false);
      setForm({ name: '', code: '', description: '', trigger_type: 'manual' });

      toast.success(t('common.success'), t('common.create'));
      navigate(`/workflows/designer/${data.id}`);
    },
  });

  /**
   * DELETE WORKFLOW
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(t('common.success'), t('common.delete'));
    },
  });

  /**
   * TOGGLE ACTIVE
   */
  const toggleActive = useMutation({
    mutationFn: async (params: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active: params.is_active })
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  /**
   * CREATE HANDLER
   */
  const handleCreate = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error(t('common.error'), 'Name and code required');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('workflows.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('workflows.subtitle')}
          </p>
        </div>

        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('workflows.newWorkflow')}
        </Button>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : workflows?.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <GitBranch className="h-10 w-10 mb-3 text-gray-300" />
          <p>{t('templates.noTemplates')}</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            {t('workflows.newWorkflow')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map((wf) => (
            <Card
              key={wf.id}
              className="cursor-pointer hover:border-blue-300 transition"
              onClick={() => navigate(`/workflows/designer/${wf.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <GitBranch className="h-5 w-5 text-cyan-600" />

                  <div className="flex gap-2">
                    <Badge variant={wf.is_published ? 'success' : 'secondary'}>
                      {wf.is_published ? 'Published' : 'Draft'}
                    </Badge>

                    <Badge variant={wf.is_active ? 'default' : 'outline'}>
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-semibold">{wf.name}</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {wf.description || '—'}
                </p>

                <div className="text-xs text-gray-400 flex justify-between">
                  <span>{wf.code}</span>
                  <span>v{wf.version}</span>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-400">
                    {formatDate(wf.updated_at)}
                  </span>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive.mutate({
                          id: wf.id,
                          is_active: !wf.is_active,
                        });
                      }}
                    >
                      {wf.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workflows/designer/${wf.id}`);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('common.confirm'))) {
                          deleteMutation.mutate(wf.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('workflows.newWorkflow')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
            />

            <Input
              placeholder="Code"
              value={form.code}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  code: e.target.value.toUpperCase(),
                }))
              }
            />

            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>

            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
            >
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}