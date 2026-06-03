/**
 * Notification Repository
 */

import { supabase } from '@/shared/api/supabase';
import { BaseRepository, ApiError } from '@/shared/lib/repository';
import { Notification, NotificationFilter, CreateNotificationInput, UpdateNotificationInput } from '../model/notification';
import { NotificationMapper, NotificationDTO } from '../model/notification.mapper';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications');
  }

  protected query() {
    return supabase.from('notifications');
  }

  async findWithFilters(
    filter: NotificationFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      let query = supabase.from('notifications').select('*');

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.organizationId) {
        query = query.eq('organization_id', filter.organizationId);
      }

      if (filter.notificationType) {
        query = query.eq('notification_type', filter.notificationType);
      }

      if (filter.isRead !== undefined) {
        query = query.eq('is_read', filter.isRead);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw new ApiError(500, error.code, error.message);

      return (data || []).map((dto) => NotificationMapper.toDomain(dto as NotificationDTO));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async findForUser(userId: string, limit: number = 50): Promise<Notification[]> {
    return this.findWithFilters({ userId }, limit);
  }

  async findUnreadForUser(userId: string): Promise<Notification[]> {
    return this.findWithFilters({ userId, isRead: false });
  }

  async findByOrganization(organizationId: string, limit: number = 100): Promise<Notification[]> {
    return this.findWithFilters({ organizationId }, limit);
  }

  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: input.userId,
          organization_id: '', // Would need to come from context
          notification_type: input.notificationType,
          priority: input.priority || 0,
          title: input.title,
          message: input.message || null,
          entity_type: input.entityType || null,
          entity_id: input.entityId || null,
          action_url: input.actionUrl || null,
          data: input.data || {},
          expires_at: input.expiresAt?.toISOString() || null,
          is_read: false,
          delivery_status: { in_app: true },
        })
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return NotificationMapper.toDomain(data as NotificationDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return NotificationMapper.toDomain(data as NotificationDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async markAsUnread(notificationId: string): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: false,
          read_at: null,
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);

      return NotificationMapper.toDomain(data as NotificationDTO);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id', { count: 'exact', head: true });

      if (error) throw new ApiError(500, error.code, error.message);

      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async countUnreadForUser(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw new ApiError(500, error.code, error.message);

      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw new ApiError(500, error.code, error.message);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }
}

export const notificationRepository = new NotificationRepository();
