/**
 * Centralized Authorization Service
 *
 * Handles all permission checks and role-based access control.
 * Pages and features must check permissions via this service.
 */

import { supabase } from '@/shared/api/supabase';

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  APPROVER = 'approver',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
}

export enum Permission {
  // Document permissions
  CREATE_DOCUMENT = 'create_document',
  EDIT_DOCUMENT = 'edit_document',
  DELETE_DOCUMENT = 'delete_document',
  APPROVE_DOCUMENT = 'approve_document',
  SIGN_DOCUMENT = 'sign_document',

  // Workflow permissions
  CREATE_WORKFLOW = 'create_workflow',
  EDIT_WORKFLOW = 'edit_workflow',
  DELETE_WORKFLOW = 'delete_workflow',
  PUBLISH_WORKFLOW = 'publish_workflow',
  START_WORKFLOW = 'start_workflow',

  // Task permissions
  ASSIGN_TASK = 'assign_task',
  COMPLETE_TASK = 'complete_task',
  DELEGATE_TASK = 'delegate_task',

  // Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ORGANIZATION = 'manage_organization',
  VIEW_AUDIT_LOG = 'view_audit_log',
  MANAGE_SECURITY = 'manage_security',

  // Template permissions
  CREATE_TEMPLATE = 'create_template',
  EDIT_TEMPLATE = 'edit_template',
  DELETE_TEMPLATE = 'delete_template',

  // Nomenclature permissions
  MANAGE_NOMENCLATURE = 'manage_nomenclature',
}

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  departmentId?: string;
  role: Role;
  permissions: Permission[];
  isActive: boolean;
}

export interface AuthContext {
  user: AuthUser;
  organizationId: string;
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.MANAGER]: [
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.APPROVE_DOCUMENT,
    Permission.ASSIGN_TASK,
    Permission.COMPLETE_TASK,
    Permission.DELEGATE_TASK,
    Permission.CREATE_WORKFLOW,
    Permission.PUBLISH_WORKFLOW,
    Permission.START_WORKFLOW,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT_LOG,
  ],
  [Role.APPROVER]: [
    Permission.COMPLETE_TASK,
    Permission.APPROVE_DOCUMENT,
    Permission.SIGN_DOCUMENT,
    Permission.DELEGATE_TASK,
    Permission.VIEW_AUDIT_LOG,
  ],
  [Role.CONTRIBUTOR]: [
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.COMPLETE_TASK,
    Permission.DELEGATE_TASK,
  ],
  [Role.VIEWER]: [],
};

class AuthorizationService {
  /**
   * Check if user has a specific permission
   */
  hasPermission(context: AuthContext, permission: Permission): boolean {
    return context.user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(
    context: AuthContext,
    permissions: Permission[]
  ): boolean {
    return permissions.some((p) => context.user.permissions.includes(p));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(
    context: AuthContext,
    permissions: Permission[]
  ): boolean {
    return permissions.every((p) => context.user.permissions.includes(p));
  }

  /**
   * Check if user has a specific role
   */
  hasRole(context: AuthContext, role: Role): boolean {
    return context.user.role === role;
  }

  /**
   * Check if user belongs to same organization
   */
  isInOrganization(context: AuthContext, organizationId: string): boolean {
    return context.user.organizationId === organizationId;
  }

  /**
   * Get permissions for a role
   */
  getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Assert permission - throws if not permitted
   */
  assertPermission(
    context: AuthContext,
    permission: Permission
  ): void {
    if (!this.hasPermission(context, permission)) {
      throw new PermissionError(
        `User does not have permission: ${permission}`
      );
    }
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export const authService = new AuthorizationService();
