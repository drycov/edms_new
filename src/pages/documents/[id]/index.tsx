import { useParams, useNavigate } from 'react-router-dom';
import { useDocument } from '../../../entities/document';
import { useWorkflowRuns, useWorkflowEvents } from '../../../entities/workflow';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { formatDate } from '../../../shared/lib/utils';
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
} from 'lucide-react';
import { useState } from 'react';

export function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'versions' | 'signatures' | 'comments' | 'audit'>('details');

  const { data: document, isLoading } = useDocument(id!);
  const { data: workflowRuns } = useWorkflowRuns({ document_id: id });
  const { data: events } = useWorkflowEvents(workflowRuns?.[0]?.id || '');

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
        <p className="font-medium">Document not found</p>
        <Button className="mt-4" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'workflow', label: 'Workflow', icon: GitBranch },
    { id: 'versions', label: 'Versions', icon: History },
    { id: 'signatures', label: 'Signatures', icon: ShieldCheck },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'audit', label: 'Audit Log', icon: Clock },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <Badge variant={document.status === 'draft' ? 'secondary' : 'default'}>
              {document.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              {document.registration_number || 'Not registered'}
            </span>
            <span>Version {document.version_label}</span>
            <span>Created {formatDate(document.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/documents/${id}?edit=true`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Send to Workflow
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
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {activeTab === 'details' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">
                    {document.description || 'No description provided'}
                  </p>
                </div>

                {document.content && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Content</h3>
                    <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg">
                      {document.content}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.length > 0 ? (
                      document.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No tags</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium">{document.document_type?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nomenclature</span>
                      <span className="font-medium">{document.nomenclature_item?.code || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Document Date</span>
                      <span className="font-medium">{formatDate(document.document_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Due Date</span>
                      <span className="font-medium">{formatDate(document.due_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Confidential</span>
                      <span className="font-medium">{document.is_confidential ? 'Yes' : 'No'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Workflow Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {document.workflow_run ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{document.workflow_run.workflow?.name}</span>
                        </div>
                        <Badge>{document.workflow_run.status}</Badge>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Not in workflow</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {workflowRuns && workflowRuns.length > 0 ? (
                <div className="space-y-4">
                  {events?.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{event.event_type}</p>
                        <p className="text-sm text-gray-500">{formatDate(event.created_at)}</p>
                        {event.data && (
                          <pre className="text-xs mt-2 p-2 bg-gray-100 rounded">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No workflow runs for this document</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Version history coming soon</p>
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="text-center py-8 text-gray-500">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Digital signatures coming soon</p>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Comments coming soon</p>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Audit log coming soon</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
