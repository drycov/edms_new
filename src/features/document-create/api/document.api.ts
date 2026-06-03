/**
 * Document Create Feature - API
 *
 * Business logic and data access for document creation
 */

import { getCurrentUserOrganization } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';
import { authService, Permission } from '@/shared/lib/auth.service';
import { documentRepository } from '@/entities/document';
import { DocumentCreateForm, DocumentCreateValidator } from '../model/types';

export async function createDocument(form: DocumentCreateForm) {
  // Validate form
  const errors = DocumentCreateValidator.validate(form);
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
    Permission.CREATE_DOCUMENT
  );

  // Create document
  const document = await documentRepository.createDocument(
    profile.organization_id,
    user.id,
    {
      title: form.title,
      description: form.description || undefined,
      content: form.content || undefined,
      documentTypeId: form.documentTypeId || undefined,
      nomenclatureItemId: form.nomenclatureItemId || undefined,
      documentDate: form.documentDate ? new Date(form.documentDate) : undefined,
      isConfidential: form.isConfidential,
    }
  );

  // Audit log
  await auditService.document(
    {
      userId: user.id,
      organizationId: profile.organization_id,
      timestamp: new Date().toISOString(),
    },
    AuditAction.DOCUMENT_CREATED,
    document.id,
    { title: document.title }
  );

  return document;
}
