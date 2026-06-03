/**
 * Document Domain Types
 *
 * Pure domain models independent from database schema.
 */

export type DocumentStatus =
  | 'draft'
  | 'registered'
  | 'in_workflow'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'signed'
  | 'archived';

export interface Document {
  id: string;
  title: string;
  description: string | null;
  content: string;
  status: DocumentStatus;
  registrationNumber: string | null;
  registrationDate: Date | null;
  versionNumber: number;
  versionLabel: string;
  documentTypeId: string | null;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
}

export interface DocumentWithRelations extends Document {
  documentType?: { id: string; name: string } | null;
  createdBy?: { id: string; fullName: string; email: string } | null;
}

export interface CreateDocumentInput {
  title: string;
  description?: string;
  content: string;
  documentTypeId?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  content?: string;
  status?: DocumentStatus;
  registrationNumber?: string;
  registrationDate?: Date;
}

export interface DocumentFilter {
  status?: DocumentStatus;
  documentTypeId?: string;
  createdById?: string;
  search?: string;
  organizationId: string;
  isDeleted?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DocumentSort {
  field: 'createdAt' | 'updatedAt' | 'title' | 'registrationNumber';
  direction: 'asc' | 'desc';
}

export class DocumentEntity implements Document {
  constructor(public document: Document) {}

  id = this.document.id;
  title = this.document.title;
  description = this.document.description;
  content = this.document.content;
  status = this.document.status;
  registrationNumber = this.document.registrationNumber;
  registrationDate = this.document.registrationDate;
  versionNumber = this.document.versionNumber;
  versionLabel = this.document.versionLabel;
  documentTypeId = this.document.documentTypeId;
  organizationId = this.document.organizationId;
  createdById = this.document.createdById;
  createdAt = this.document.createdAt;
  updatedAt = this.document.updatedAt;
  isDeleted = this.document.isDeleted;
  deletedAt = this.document.deletedAt;

  isActive(): boolean {
    return !this.isDeleted;
  }

  canBeEdited(): boolean {
    return this.status === 'draft' && !this.isDeleted;
  }

  canBeSubmitted(): boolean {
    return this.status === 'draft' && !this.isDeleted;
  }

  canBeApproved(): boolean {
    return this.status === 'pending_approval' || this.status === 'in_workflow';
  }

  canBeSigned(): boolean {
    return this.status === 'approved';
  }
}
