export type { Tables as Document, InsertTables as DocumentInsert, UpdateTables as DocumentUpdate } from '../../../shared/api/supabase';

export type DocumentStatus =
  | 'draft'
  | 'registered'
  | 'in_workflow'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'signed'
  | 'archived'
  | 'deleted';

export type DocumentWithRelations = {
  id: string;
  organization_id: string;
  document_type_id: string | null;
  nomenclature_item_id: string | null;
  registration_number: string | null;
  registration_date: string | null;
  title: string;
  description: string | null;
  content: string | null;
  summary: string | null;
  version: number;
  version_label: string;
  status: DocumentStatus;
  workflow_run_id: string | null;
  priority_id: string | null;
  document_date: string | null;
  due_date: string | null;
  is_confidential: boolean;
  access_level: string;
  tags: string[];
  keywords: string[];
  metadata: Record<string, unknown>;
  is_archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  document_type?: {
    id: string;
    name: string;
    code: string;
  } | null;
  nomenclature_item?: {
    id: string;
    code: string;
    title: string;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
  workflow_run?: {
    id: string;
    status: string;
    workflow_id: string;
    workflow: {
      name: string;
    };
  } | null;
};

export type DocumentFilters = {
  status?: DocumentStatus[];
  document_type_id?: string[];
  nomenclature_item_id?: string[];
  created_by?: string[];
  created_at_from?: string;
  created_at_to?: string;
  search?: string;
  tags?: string[];
  is_archived?: boolean;
  is_deleted?: boolean;
};

export type DocumentSort = {
  field: 'created_at' | 'updated_at' | 'title' | 'status' | 'registration_date';
  direction: 'asc' | 'desc';
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: 'Draft',
  registered: 'Registered',
  in_workflow: 'In Workflow',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  signed: 'Signed',
  archived: 'Archived',
  deleted: 'Deleted',
};

export const documentStatusColors: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  registered: 'bg-blue-100 text-blue-800',
  in_workflow: 'bg-cyan-100 text-cyan-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  signed: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-100 text-slate-800',
  deleted: 'bg-red-50 text-red-600',
};
