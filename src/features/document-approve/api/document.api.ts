/**
 * Document Approve Feature - API
 *
 * Business logic and data access for document approval
 */

import { getCurrentUserOrganization } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';
import { authService, Permission } from '@/shared/lib/auth.service';
import { documentRepository } from '@/entities/document';
import { DocumentApprovalForm, DocumentApproveValidator } from '../model/types';

export async function approveDocument(form: DocumentApprovalForm) {
  // Validate form
  const errors = DocumentApproveValidator.validate(form);
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  // Get user and organization
  const { user, profile } = await getCurrentUserOrganization();

  // Check permission
  authService.assertPermission(
    {
      user: { ...user, role: user.role as any },
      organizationId: profile.organization_id,
    },
    Permission.APPROVE_DOCUMENT
  );

  // Get document first to verify access
  const document = await documentRepository.findById(form.documentId);
  if (!document || document.organizationId !== profile.organization_id) {
    throw new Error('Document not found or access denied');
  }

  // Update document status
  const updatedDocument = await documentRepository.updateDocument(form.documentId, {
    status: 'approved',
  });

  // Audit log
  await auditService.document(
    {
      userId: user.id,
      organizationId: profile.organization_id,
      timestamp: new Date().toISOString(),
    },
    AuditAction.DOCUMENT_UPDATED,
    form.documentId,
    { status: 'approved', notes: form.approvalNotes }
  );

  return updatedDocument;
}

export async function rejectDocument(documentId: string, reason?: string) {
  // Get user and organization
  const { user, profile } = await getCurrentUserOrganization();

  // Check permission
  authService.assertPermission(
    {
      user: { ...user, role: user.role as any },
      organizationId: profile.organization_id,
    },
    Permission.APPROVE_DOCUMENT
  );

  // Get document first to verify access
  const document = await documentRepository.findById(documentId);
  if (!document || document.organizationId !== profile.organization_id) {
    throw new Error('Document not found or access denied');
  }

  // Update document status
  const updatedDocument = await documentRepository.updateDocument(documentId, {
    status: 'rejected',
  });

  // Audit log
  await auditService.document(
    {
      userId: user.id,
      organizationId: profile.organization_id,
      timestamp: new Date().toISOString(),
    },
    AuditAction.DOCUMENT_UPDATED,
    documentId,
    { status: 'rejected', reason }
  );

  return updatedDocument;
}
