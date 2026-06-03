import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Plus, Search, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card } from '@/shared/ui/card';
import { formatDate } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { useDocuments } from './model/useDocuments';
import { statusColors } from './model/types';
import type { DocumentStatus } from './model/types';

export function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');

  const { data: documents, isLoading } = useDocuments(search, statusFilter);

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(t('common.success'), t('common.delete'));
    },
  });

  const statuses: DocumentStatus[] = [
    'draft',
    'registered',
    'in_workflow',
    'pending_approval',
    'approved',
    'rejected',
    'signed',
    'archived',
  ];

  const getStatusLabel = (status: DocumentStatus) => t(`documents.${status}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('documents.title')}</h1>
          <p className="text-gray-500 mt-1">{t('documents.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/documents/create')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('documents.newDocument')}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder={t('search.placeholder')}
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === ''
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('common.all')}
            </button>
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : documents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="h-12 w-12 mb-4 text-gray-300" />
            <p className="font-medium">{t('documents.noDocuments')}</p>
            <p className="text-sm">{t('documents.noDocumentsDesc')}</p>
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-4 text-left text-sm font-medium text-gray-500">{t('documents.title_field')}</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">{t('documents.registrationNumber')}</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">{t('common.status')}</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">{t('common.type')}</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">{t('common.created')}</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents?.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          {doc.description && (
                            <p className="text-sm text-gray-500 truncate max-w-md">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.registration_number || '-'}
                          </p>
                          {doc.registration_date && (
                            <p className="text-xs text-gray-500">
                              {formatDate(doc.registration_date)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">
                          {doc.document_type?.name || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(doc.created_at)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/documents/${doc.id}`);
                            }}
                            className="p-2 rounded hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/documents/${doc.id}?edit=true`);
                            }}
                            className="p-2 rounded hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t('common.confirm'))) {
                                deleteDocument.mutate(doc.id);
                              }
                            }}
                            className="p-2 rounded hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
