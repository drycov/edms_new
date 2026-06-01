import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select } from '@/shared/ui/select';
import { toast } from '@/shared/ui/toaster';
import { useTranslation } from 'react-i18next';

export function CreateDocumentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    document_type_id: '',
    nomenclature_item_id: '',
    document_date: new Date().toISOString().split('T')[0],
    is_confidential: false,
  });

  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
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
        .from('document_types')
        .select('id, name, code')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: nomenclatureItems } = useQuery({
    queryKey: ['nomenclature-items-select'],
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
        .from('nomenclature_items')
        .select('id, code, title')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data;
    },
  });

  const createDocument = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: form.title,
          description: form.description || null,
          content: form.content || null,
          document_type_id: form.document_type_id || null,
          nomenclature_item_id: form.nomenclature_item_id || null,
          document_date: form.document_date || null,
          is_confidential: form.is_confidential,
          organization_id: profile.organization_id,
          created_by: user.id,
          status: 'draft',
          version_label: '1.0',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(t('common.success'), t('documents.createDocument'));
      navigate(`/documents/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(t('common.error'), error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error(t('common.error'), t('documents.title_field') + ' is required');
      return;
    }
    createDocument.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('documents.createDocument')}</h1>
        <p className="text-gray-500 mt-1">{t('documents.noDocumentsDesc')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('documents.documentDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('documents.title_field')} <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t('documents.title_field')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('documents.description_field')}
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('documents.description_field')}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.type')}
                </label>
                <Select
                  value={form.document_type_id}
                  onChange={(e) => setForm({ ...form, document_type_id: e.target.value })}
                >
                  <option value="">-- {t('common.select')} --</option>
                  {documentTypes?.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('nomenclature.title')}
                </label>
                <Select
                  value={form.nomenclature_item_id}
                  onChange={(e) => setForm({ ...form, nomenclature_item_id: e.target.value })}
                >
                  <option value="">-- {t('common.select')} --</option>
                  {nomenclatureItems?.map((ni) => (
                    <option key={ni.id} value={ni.id}>
                      {ni.code} - {ni.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.date')}
                </label>
                <Input
                  type="date"
                  value={form.document_date}
                  onChange={(e) => setForm({ ...form, document_date: e.target.value })}
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_confidential}
                    onChange={(e) => setForm({ ...form, is_confidential: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {t('archive.legalHold')}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('documents.content')}
              </label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={t('documents.content')}
                rows={10}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/documents')}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={createDocument.isPending}>
            {t('documents.createDocument')}
          </Button>
        </div>
      </form>
    </div>
  );
}
