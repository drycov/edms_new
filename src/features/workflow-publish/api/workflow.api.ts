/**
 * Workflow Publish Feature - API
 *
 * Business logic and data access for workflow publication
 */

import { getCurrentUserOrganization } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';
import { authService, Permission } from '@/shared/lib/auth.service';
import { workflowRepository } from '@/entities/workflow';
import { WorkflowPublishForm, WorkflowPublishValidator } from '../model/types';

export async function publishWorkflow(form: WorkflowPublishForm) {
  // Validate form
  const errors = WorkflowPublishValidator.validate(form);
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
    Permission.PUBLISH_WORKFLOW
  );

  // Get workflow first to verify access and status
  const workflow = await workflowRepository.findById(form.workflowId);
  if (!workflow || workflow.organizationId !== profile.organization_id) {
    throw new Error('Workflow not found or access denied');
  }

  if (!workflow.canPublish?.()) {
    throw new Error('This workflow cannot be published in its current status');
  }

  // Publish workflow
  const publishedWorkflow = await workflowRepository.publishWorkflow(form.workflowId);

  // Audit log
  await auditService.workflow(
    {
      userId: user.id,
      organizationId: profile.organization_id,
      timestamp: new Date().toISOString(),
    },
    AuditAction.WORKFLOW_PUBLISHED,
    form.workflowId,
    { name: publishedWorkflow.name, notes: form.publishNotes }
  );

  return publishedWorkflow;
}
