import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Archive, Lock, Download, RotateCcw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

type ArchivedDocument = {
  id: string;
  title: string;
  registration_number: string | null;
  archived_at: string | null;
  archive_reason: string | null;
  document_type: { name: string } | null;
  nomenclature_item: { code: string; title: string } | null;
};

export function ArchivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['archived-documents', search],
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
        .from('documents')
        .select(`
          id,
          title,
          registration_number,
          archived_at,
          archive_reason,
          document_type:document_types(name),
          nomenclature_item:nomenclature_items(code, title)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_archived', true)
        .eq('is_deleted', false)
        .order('archived_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,registration_number.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ArchivedDocument[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['archive-stats'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { count: totalArchived } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_archived', true);

      const { count: forDestruction } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_archived', true);

      const { count: legalHold } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_archived', true)
        .eq('is_confidential', true);

      return {
        totalArchived: totalArchived || 0,
        forDestruction: forDestruction || 0,
        legalHold: legalHold || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('archive.title')}</h1>
          <p className="text-gray-500 mt-1">{t('archive.subtitle')}</p>
        </div>
        <Button variant="outline">
          <Lock className="h-4 w-4 mr-2" />
          {t('archive.retentionPolicies')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Archive className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalArchived || 0}</p>
                <p className="text-sm text-gray-500">{t('archive.title')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.legalHold || 0}</p>
                <p className="text-sm text-gray-500">{t('archive.legalHold')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Archive className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.forDestruction || 0}</p>
                <p className="text-sm text-gray-500">{t('archive.destroy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Archive className="h-12 w-12 mb-4 text-gray-300" />
              <p className="font-medium">{t('documents.noDocuments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('documents.title_field')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('documents.registrationNumber')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('common.type')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('archive.retentionPolicies')}</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents?.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{doc.title}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {doc.registration_number || t('documents.notRegistered')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {doc.document_type?.name || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {formatDate(doc.archived_at)}
                        </span>
                        {doc.archive_reason && (
                          <p className="text-xs text-gray-400">{doc.archive_reason}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
