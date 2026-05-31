import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { useDocuments } from '../../entities/document';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Card } from '../../shared/ui/card';
import { formatDate } from '../../shared/lib/utils';
import { documentStatusLabels, documentStatusColors } from '../../entities/document';
import type { DocumentStatus } from '../../entities/document';

export function DocumentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus[]>([]);

  const { data: documents, isLoading } = useDocuments({
    search,
    status: statusFilter.length > 0 ? statusFilter : undefined,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">Manage and track all organizational documents</p>
        </div>
        <Button onClick={() => navigate('/documents/create')}>
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => {
                  if (statusFilter.includes(status)) {
                    setStatusFilter(statusFilter.filter((s) => s !== status));
                  } else {
                    setStatusFilter([...statusFilter, status]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter.includes(status)
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {documentStatusLabels[status]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : documents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="h-12 w-12 mb-4 text-gray-300" />
            <p className="font-medium">No documents found</p>
            <p className="text-sm">Get started by creating a new document</p>
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-4 text-left text-sm font-medium text-gray-500">Document</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">Registration</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">Type</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">Created</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500">Actions</th>
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
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${documentStatusColors[doc.status as DocumentStatus]}`}>
                          {documentStatusLabels[doc.status as DocumentStatus]}
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

function FileText(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
