import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Plus, Files, Settings, Eye, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/shared/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { toast } from '@/shared/ui/toaster';

type Template = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  template_type: string;
  version: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    code: '',
    description: '',
    template_type: 'docx',
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
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
        .from('document_templates')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (payload: typeof newTemplate) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          name: payload.name,
          code: payload.code,
          description: payload.description,
          template_type: payload.template_type,
          organization_id: profile.organization_id,
          created_by: user.id,
          storage_path: `templates/${payload.code}.docx`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowCreateDialog(false);
      setNewTemplate({ name: '', code: '', description: '', template_type: 'docx' });
      toast.success(t('common.success'), t('templates.createFirst'));
    },
    onError: (error: any) => {
      toast.error(t('common.error'), error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(t('common.success'), t('common.delete'));
    },
  });

  const handleCreate = () => {
    if (!newTemplate.name || !newTemplate.code) {
      toast.error(t('common.error'), t('common.name') + ' is required');
      return;
    }
    createTemplate.mutate(newTemplate);
  };

  const templateTypeLabels: Record<string, string> = {
    docx: 'DOCX',
    xlsx: 'XLSX',
    pdf: 'PDF',
    html: 'HTML',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('templates.title')}</h1>
          <p className="text-gray-500 mt-1">{t('templates.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('templates.newTemplate')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : templates?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Files className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">{t('templates.noTemplates')}</p>
          <p className="text-sm">{t('templates.createFirst')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id} className="hover:border-blue-300 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Files className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    {template.is_published ? (
                      <Badge variant="success">{t('workflows.published')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('workflows.draft')}</Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{template.description || t('common.none')}</p>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span>{templateTypeLabels[template.template_type] || template.template_type}</span>
                  <span>v{template.version}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-gray-500">
                    {formatDate(template.updated_at)}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTemplate.mutate(template.id)}
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
            <DialogTitle>{t('templates.newTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.name')} *
              </label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder={t('common.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.code')} *
              </label>
              <Input
                value={newTemplate.code}
                onChange={(e) => setNewTemplate({ ...newTemplate, code: e.target.value })}
                placeholder="TEMPLATE_001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.type')}
              </label>
              <Select
                value={newTemplate.template_type}
                onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
              >
                <option value="docx">DOCX</option>
                <option value="xlsx">XLSX</option>
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.description')}
              </label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder={t('common.description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={createTemplate.isPending}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
