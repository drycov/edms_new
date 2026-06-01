import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { Search, FileText, GitBranch, Files } from 'lucide-react';
import { Input } from '../../shared/ui/input';
import { Card, CardContent } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../../shared/lib/utils';

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return null;

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      // Search documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title, description, status, registration_number, created_at')
        .eq('organization_id', profile.organization_id)
        .eq('is_deleted', false)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);

      // Search workflows
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, name, description, is_active')
        .eq('organization_id', profile.organization_id)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      // Search templates
      const { data: templates } = await supabase
        .from('document_templates')
        .select('id, name, code, template_type')
        .eq('organization_id', profile.organization_id)
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .limit(10);

      return {
        documents: documents || [],
        workflows: workflows || [],
        templates: templates || [],
        total: (documents?.length || 0) + (workflows?.length || 0) + (templates?.length || 0),
      };
    },
    enabled: query.length >= 2,
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchTerm = formData.get('search') as string;
    setSearchParams({ q: searchTerm });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('search.title')}</h1>
        <p className="text-gray-500 mt-1">{t('search.subtitle')}</p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            name="search"
            defaultValue={query}
            placeholder={t('search.placeholder')}
            className="h-12 pl-12 text-base"
          />
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : !query || query.length < 2 ? (
        <div className="text-center py-12 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>{t('search.placeholder')}</p>
        </div>
      ) : results?.total === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">{t('search.noResults')}</p>
          <p className="text-sm">{t('search.tryDifferent')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            {results?.total} {t('search.results')} "{query}"
          </p>

          {results?.documents && results.documents.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('documents.title')} ({results.documents.length})
              </h2>
              <div className="space-y-2">
                {results.documents.map((doc: any) => (
                  <Card
                    key={doc.id}
                    className="hover:border-blue-300 cursor-pointer"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          <p className="text-sm text-gray-500">{doc.registration_number || '-'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{doc.status}</Badge>
                          <span className="text-xs text-gray-500">{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results?.workflows && results.workflows.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {t('workflows.title')} ({results.workflows.length})
              </h2>
              <div className="space-y-2">
                {results.workflows.map((wf: any) => (
                  <Card
                    key={wf.id}
                    className="hover:border-blue-300 cursor-pointer"
                    onClick={() => navigate('/workflows')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{wf.name}</p>
                        <Badge variant={wf.is_active ? 'success' : 'secondary'}>
                          {wf.is_active ? t('workflows.active') : t('workflows.inactive')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results?.templates && results.templates.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Files className="h-5 w-5" />
                {t('templates.title')} ({results.templates.length})
              </h2>
              <div className="space-y-2">
                {results.templates.map((tpl: any) => (
                  <Card
                    key={tpl.id}
                    className="hover:border-blue-300 cursor-pointer"
                    onClick={() => navigate('/templates')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{tpl.name}</p>
                          <p className="text-sm text-gray-500">{tpl.code}</p>
                        </div>
                        <Badge variant="secondary">{tpl.template_type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
