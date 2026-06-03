/**
 * Notification DTO + Mapper
 */

import type { Tables } from '@/shared/api/supabase';
import { Notification, NotificationEntity } from './notification';

export type NotificationDTO = Tables<'notifications'>;

export class NotificationMapper {
  static toDomain(dto: NotificationDTO): Notification {
    return {
      id: dto.id,
      organizationId: dto.organization_id,
      userId: dto.user_id,
      notificationType: dto.notification_type as any,
      priority: dto.priority,
      title: dto.title,
      message: dto.message,
      entityType: dto.entity_type,
      entityId: dto.entity_id,
      actionUrl: dto.action_url,
      isRead: dto.is_read,
      readAt: dto.read_at ? new Date(dto.read_at) : null,
      deliveryStatus: dto.delivery_status as Record<string, boolean | null>,
      deliveryAttempts: dto.delivery_attempts,
      lastDeliveryAttempt: dto.last_delivery_attempt ? new Date(dto.last_delivery_attempt) : null,
      data: dto.data as Record<string, any>,
      expiresAt: dto.expires_at ? new Date(dto.expires_at) : null,
      createdAt: new Date(dto.created_at),
    };
  }

  static toDTO(entity: Notification): Partial<NotificationDTO> {
    return {
      id: entity.id,
      organization_id: entity.organizationId,
      user_id: entity.userId,
      notification_type: entity.notificationType as any,
      priority: entity.priority,
      title: entity.title,
      message: entity.message,
      entity_type: entity.entityType,
      entity_id: entity.entityId,
      action_url: entity.actionUrl,
      is_read: entity.isRead,
      read_at: entity.readAt?.toISOString(),
      delivery_status: entity.deliveryStatus as any,
      delivery_attempts: entity.deliveryAttempts,
      last_delivery_attempt: entity.lastDeliveryAttempt?.toISOString(),
      data: entity.data as any,
      expires_at: entity.expiresAt?.toISOString(),
      created_at: entity.createdAt.toISOString(),
    };
  }

  static createEntity(dto: NotificationDTO): NotificationEntity {
    return new NotificationEntity(this.toDomain(dto));
  }
}
