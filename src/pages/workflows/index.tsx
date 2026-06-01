import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { Plus, GitBranch, Settings, Trash2, Play, Pause, Copy } from 'lucide-react';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { formatDate } from '../../shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../shared/ui/dialog';
import { Input } from '../../shared/ui/input';
import { Textarea } from '../../shared/ui/textarea';
import { toast } from '../../shared/ui/toaster';

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    code: '',
    description: '',
    trigger_type: 'manual',
  });

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

  const createWorkflow = useMutation({
    mutationFn: async (payload: typeof newWorkflow) => {
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
          name: payload.name,
          code: payload.code,
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
      setShowCreateDialog(false);
      setNewWorkflow({ name: '', code: '', description: '', trigger_type: 'manual' });
      toast.success(t('common.success'), t('common.create'));
      navigate(`/workflows/designer/${data.id}`);
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(t('common.success'), t('common.delete'));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const handleCreate = () => {
    if (!newWorkflow.name || !newWorkflow.code) {
      toast.error(t('common.error'), t('common.name') + ' is required');
      return;
    }
    createWorkflow.mutate(newWorkflow);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('workflows.title')}</h1>
          <p className="text-gray-500 mt-1">{t('workflows.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('workflows.newWorkflow')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : workflows?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <GitBranch className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">{t('templates.noTemplates')}</p>
          <p className="text-sm">{t('templates.createFirst')}</p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            {t('workflows.newWorkflow')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows?.map((workflow) => (
            <Card
              key={workflow.id}
              className="hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/workflows/designer/${workflow.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    {workflow.is_published ? (
                      <Badge variant="success">{t('workflows.published')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('workflows.draft')}</Badge>
                    )}
                    {workflow.is_active ? (
                      <Badge variant="default">{t('workflows.active')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('workflows.inactive')}</Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{workflow.description || t('common.none')}</p>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{t('nomenclature.code')}: {workflow.code}</span>
                  <span>v{workflow.version}</span>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDate(workflow.updated_at)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive.mutate({ id: workflow.id, is_active: !workflow.is_active });
                      }}
                    >
                      {workflow.is_active ? (
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
                        navigate(`/workflows/designer/${workflow.id}`);
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
                          deleteWorkflow.mutate(workflow.id);
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workflows.newWorkflow')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.name')} *
              </label>
              <Input
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                placeholder={t('common.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.code')} *
              </label>
              <Input
                value={newWorkflow.code}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, code: e.target.value.toUpperCase() })}
                placeholder="WF_001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.description')}
              </label>
              <Textarea
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder={t('common.description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={createWorkflow.isPending}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
