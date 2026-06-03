/**
 * Task Delegate Feature - API
 *
 * Business logic and data access for task delegation
 */

import { getCurrentUserOrganization } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';
import { authService, Permission } from '@/shared/lib/auth.service';
import { taskRepository } from '@/entities/task';
import { TaskDelegationForm, TaskDelegationValidator } from '../model/types';

export async function delegateTask(form: TaskDelegationForm) {
  // Validate form
  const errors = TaskDelegationValidator.validate(form);
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
    Permission.DELEGATE_TASK
  );

  // Get task first to verify it can be delegated
  const task = await taskRepository.findById(form.taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  if (!task.canDelegate?.()) {
    throw new Error('This task cannot be delegated in its current status');
  }

  // Delegate task
  const delegatedTask = await taskRepository.delegateTask(
    form.taskId,
    form.newAssigneeId,
    form.reason
  );

  // Audit log
  await auditService.task(
    {
      userId: user.id,
      organizationId: profile.organization_id,
      timestamp: new Date().toISOString(),
    },
    AuditAction.TASK_DELEGATED,
    form.taskId,
    { delegatedTo: form.newAssigneeId, reason: form.reason }
  );

  return delegatedTask;
}
