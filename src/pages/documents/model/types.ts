export type DocumentStatus = 'draft' | 'registered' | 'in_workflow' | 'pending_approval' | 'approved' | 'rejected' | 'signed' | 'archived';

export type Document = {
  id: string;
  title: string;
  description: string | null;
  status: DocumentStatus;
  registration_number: string | null;
  registration_date: string | null;
  version_label: string;
  created_at: string;
  document_type: { name: string } | null;
};

export const statusColors: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  registered: 'bg-blue-100 text-blue-800',
  in_workflow: 'bg-cyan-100 text-cyan-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  signed: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-100 text-slate-800',
};
