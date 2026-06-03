/**
 * Document Approve Feature - Model
 *
 * Domain types and business logic for document approval
 */

export interface DocumentApprovalForm {
  documentId: string;
  approvalNotes?: string;
  approvalDate?: string;
}

export interface DocumentApprovePayload {
  userId: string;
  organizationId: string;
  documentId: string;
  notes?: string;
}

export interface DocumentApprovedEvent {
  documentId: string;
  approvedBy: string;
  approvalDate: string;
  notes?: string;
}

export class DocumentApproveValidator {
  static validate(form: DocumentApprovalForm): string[] {
    const errors: string[] = [];

    if (!form.documentId?.trim()) {
      errors.push('Document ID is required');
    }

    if (form.approvalNotes && form.approvalNotes.length > 5000) {
      errors.push('Approval notes must be less than 5,000 characters');
    }

    return errors;
  }

  static isValid(form: DocumentApprovalForm): boolean {
    return this.validate(form).length === 0;
  }
}
