/**
 * Centralized Audit Service
 *
 * Provides type-safe audit logging for all domain actions.
 * All mutations must log via this service to maintain compliance.
 */

import { supabase } from '@/shared/api/supabase';

export interface AuditContext {
  userId: string;
  organizationId: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export enum AuditAction {
  // Document actions
  DOCUMENT_CREATED = 'document_created',
  DOCUMENT_UPDATED = 'document_updated',
  DOCUMENT_DELETED = 'document_deleted',
  DOCUMENT_ARCHIVED = 'document_archived',
  DOCUMENT_RESTORED = 'document_restored',
  DOCUMENT_REGISTERED = 'document_registered',

  // Workflow actions
  WORKFLOW_CREATED = 'workflow_created',
  WORKFLOW_UPDATED = 'workflow_updated',
  WORKFLOW_PUBLISHED = 'workflow_published',
  WORKFLOW_DELETED = 'workflow_deleted',
  WORKFLOW_STARTED = 'workflow_started',

  // Task actions
  TASK_ASSIGNED = 'task_assigned',
  TASK_DELEGATED = 'task_delegated',
  TASK_COMPLETED = 'task_completed',
  TASK_APPROVED = 'task_approved',
  TASK_REJECTED = 'task_rejected',
  TASK_SIGNED = 'task_signed',

  // Version actions
  VERSION_CREATED = 'version_created',
  VERSION_RESTORED = 'version_restored',

  // Comment actions
  COMMENT_CREATED = 'comment_created',
  COMMENT_UPDATED = 'comment_updated',
  COMMENT_DELETED = 'comment_deleted',
  COMMENT_RESOLVED = 'comment_resolved',

  // Relation actions
  RELATION_CREATED = 'relation_created',
  RELATION_DELETED = 'relation_deleted',

  // User actions
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  USER_UPDATED = 'user_updated',

  // Admin actions
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  PERMISSION_CHANGED = 'permission_changed',
}

export interface AuditLogEntry {
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  status: 'success' | 'failure';
  errorMessage?: string;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(
    context: AuditContext,
    entry: AuditLogEntry
  ): Promise<void> {
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: context.userId,
        organization_id: context.organizationId,
        action: entry.action,
        entity_type: entry.entity,
        entity_id: entry.entityId,
        data: {
          changes: entry.changes,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
        },
        status: entry.status,
        error_message: entry.errorMessage,
        timestamp: context.timestamp,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
      });

      if (error) {
        console.error('Audit logging failed:', error);
        // Don't throw - audit failure shouldn't break the app
      }
    } catch (error) {
      console.error('Unexpected error during audit logging:', error);
    }
  }

  /**
   * Log successful action
   */
  async success(
    context: AuditContext,
    action: AuditAction,
    entity: string,
    entityId: string,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.log(context, {
      action,
      entity,
      entityId,
      changes,
      status: 'success',
    });
  }

  /**
   * Log failed action
   */
  async failure(
    context: AuditContext,
    action: AuditAction,
    entity: string,
    entityId: string,
    errorMessage: string
  ): Promise<void> {
    await this.log(context, {
      action,
      entity,
      entityId,
      status: 'failure',
      errorMessage,
    });
  }

  /**
   * Log document action
   */
  async document(
    context: AuditContext,
    action: AuditAction,
    documentId: string,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.success(context, action, 'document', documentId, changes);
  }

  /**
   * Log workflow action
   */
  async workflow(
    context: AuditContext,
    action: AuditAction,
    workflowId: string,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.success(context, action, 'workflow', workflowId, changes);
  }

  /**
   * Log task action
   */
  async task(
    context: AuditContext,
    action: AuditAction,
    taskId: string,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.success(context, action, 'task', taskId, changes);
  }
}

export const auditService = new AuditService();
