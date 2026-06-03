/**
 * Notification Domain Types
 */

export type NotificationType =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'approval_required'
  | 'document_shared'
  | 'task_assigned'
  | 'workflow_completed'
  | 'signature_requested'
  | 'comment_mentioned';

export type DeliveryChannel = 'in_app' | 'email' | 'telegram' | 'push' | 'webhook';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  notificationType: NotificationType;
  priority: number;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  deliveryStatus: Record<DeliveryChannel, boolean | null>;
  deliveryAttempts: number;
  lastDeliveryAttempt: Date | null;
  data: Record<string, any>;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  notificationType: NotificationType;
  title: string;
  message?: string;
  priority?: number;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

export interface UpdateNotificationInput {
  isRead?: boolean;
  deliveryStatus?: Record<DeliveryChannel, boolean | null>;
}

export interface NotificationFilter {
  userId?: string;
  notificationType?: NotificationType;
  isRead?: boolean;
  organizationId?: string;
}

export class NotificationEntity implements Notification {
  constructor(public notification: Notification) {}

  id = this.notification.id;
  organizationId = this.notification.organizationId;
  userId = this.notification.userId;
  notificationType = this.notification.notificationType;
  priority = this.notification.priority;
  title = this.notification.title;
  message = this.notification.message;
  entityType = this.notification.entityType;
  entityId = this.notification.entityId;
  actionUrl = this.notification.actionUrl;
  isRead = this.notification.isRead;
  readAt = this.notification.readAt;
  deliveryStatus = this.notification.deliveryStatus;
  deliveryAttempts = this.notification.deliveryAttempts;
  lastDeliveryAttempt = this.notification.lastDeliveryAttempt;
  data = this.notification.data;
  expiresAt = this.notification.expiresAt;
  createdAt = this.notification.createdAt;

  isUnread(): boolean {
    return !this.isRead;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isDeliveryFailed(): boolean {
    return this.deliveryAttempts > 0 &&
           this.deliveryStatus &&
           Object.values(this.deliveryStatus).every(status => status === false || status === null);
  }

  canRetryDelivery(): boolean {
    return !this.isExpired() && (this.deliveryAttempts < 3);
  }
}
