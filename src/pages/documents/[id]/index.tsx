import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/api/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { formatDate } from '../../../shared/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  GitBranch,
  Clock,
  Edit,
  Send,
  Download,
  CheckCircle,
  MessageSquare,
  History,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from '../../../shared/ui/toaster';

type DocumentStatus = 'draft' | 'registered' | 'in_workflow' | 'pending_approval' | 'approved' | 'rejected' | 'signed' | 'archived';

const statusColors: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  registered: 'bg-blue-100 text-blue-800',
  in_workflow: 'bg-cyan-100 text-cyan-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  signed: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-100 text-slate-800',
};

export function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'versions' | 'signatures' | 'comments' | 'audit'>('details');

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_type:document_types(name),
          nomenclature_item:nomenclature_items(code, title),
          created_by_user:profiles!documents_created_by_fkey(full_name)
        `)
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: workflowRuns } = useQuery({
    queryKey: ['workflow-runs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select(`
          id,
          status,
          created_at,
          workflow:workflows(name)
        `)
        .eq('document_id', id!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: signatures } = useQuery({
    queryKey: ['document-signatures', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_signatures')
        .select(`
          *,
          signer:profiles(full_name)
        `)
        .eq('document_id', id!);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['document-audit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'document')
        .eq('entity_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!id && activeTab === 'audit',
  });

  const { data: versions } = useQuery({
    queryKey: ['document-versions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          created_by_user:profiles(full_name)
        `)
        .eq('document_id', id!)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id && activeTab === 'versions',
  });

  const deleteDocument = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: true })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('common.success'), t('common.delete'));
      navigate('/documents');
    },
  });

  const registerDocument = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      // Get next registration number
      const year = new Date().getFullYear();
      const { data: lastDoc } = await supabase
        .from('documents')
        .select('registration_number')
        .eq('organization_id', profile.organization_id)
        .like('registration_number', `REG-${year}-%`)
        .order('registration_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastNum = lastDoc?.registration_number
        ? parseInt(lastDoc.registration_number.split('-')[2]) || 0
        : 0;
      const nextNum = lastNum + 1;
      const registrationNumber = `REG-${year}-${String(nextNum).padStart(6, '0')}`;

      const { error } = await supabase
        .from('documents')
        .update({
          status: 'registered',
          registration_number: registrationNumber,
          registration_date: new Date().toISOString(),
        })
        .eq('id', id!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      toast.success(t('common.success'), t('documents.registered'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileText className="h-12 w-12 mb-4 text-gray-300" />
        <p className="font-medium">{t('documents.noDocuments')}</p>
        <Button className="mt-4" onClick={() => navigate('/documents')}>
          {t('documents.title')}
        </Button>
      </div>
    );
  }

  const getStatusLabel = (status: DocumentStatus) => {
    return t(`documents.${status}`);
  };

  const tabs = [
    { id: 'details', labelKey: 'documents.documentDetails', icon: FileText },
    { id: 'workflow', labelKey: 'workflows.title', icon: GitBranch },
    { id: 'versions', labelKey: 'documents.versions', icon: History },
    { id: 'signatures', labelKey: 'documents.signatures', icon: ShieldCheck },
    { id: 'comments', labelKey: 'documents.comments', icon: MessageSquare },
    { id: 'audit', labelKey: 'documents.auditLog_tab', icon: Clock },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <Badge className={statusColors[document.status as DocumentStatus]}>
              {getStatusLabel(document.status as DocumentStatus)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{document.registration_number || t('documents.notRegistered')}</span>
            <span>{t('documents.version')} {document.version_label}</span>
            <span>{t('common.created')} {formatDate(document.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {document.status === 'draft' && (
            <Button onClick={() => registerDocument.mutate()} loading={registerDocument.isPending}>
              {t('documents.registered')}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/documents/${id}?edit=true`)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
          <Button variant="outline" onClick={() => {
            if (confirm(t('common.confirm'))) {
              deleteDocument.mutate();
            }
          }}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      <Card>
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {activeTab === 'details' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('documents.description_field')}</h3>
                  <p className="text-gray-600">
                    {document.description || t('common.none')}
                  </p>
                </div>

                {document.content && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{t('documents.content')}</h3>
                    <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {document.content}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('documents.tags')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags?.length > 0 ? (
                      document.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">{t('common.none')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{t('documents.metadata')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('common.type')}</span>
                      <span className="font-medium">{document.document_type?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('nomenclature.title')}</span>
                      <span className="font-medium">{document.nomenclature_item?.code || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('common.date')}</span>
                      <span className="font-medium">{formatDate(document.document_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('archive.legalHold')}</span>
                      <span className="font-medium">{document.is_confidential ? t('common.yes') : t('common.no')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('common.created')} {t('common.by')}</span>
                      <span className="font-medium">{document.created_by_user?.full_name || '-'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {workflowRuns && workflowRuns.length > 0 ? (
                <div className="space-y-4">
                  {workflowRuns.map((run: any) => (
                    <div key={run.id} className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{run.workflow?.name || 'Workflow'}</span>
                        <Badge>{run.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{t('common.created')}: {formatDate(run.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('workflows.inactive')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4">
              {versions && versions.length > 0 ? (
                versions.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{t('documents.version')} {v.version_number}</p>
                      <p className="text-sm text-gray-500">{v.change_summary || 'No summary'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(v.created_at)}</p>
                      <p className="text-xs text-gray-400">{v.created_by_user?.full_name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('documents.versions')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="space-y-4">
              {signatures && signatures.length > 0 ? (
                signatures.map((sig: any) => (
                  <div key={sig.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{sig.signer?.full_name}</p>
                        <p className="text-sm text-gray-500">{sig.signature_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={sig.signed_at ? 'success' : 'secondary'}>
                        {sig.signed_at ? t('documents.signed') : t('approvals.pending')}
                      </Badge>
                      {sig.signed_at && (
                        <p className="text-xs text-gray-400 mt-1">{formatDate(sig.signed_at)}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('documents.signatures')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t('documents.comments')}</p>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2">
              {auditLogs?.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{log.action}</p>
                    <p className="text-sm text-gray-500">{log.user_name || 'System'}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
