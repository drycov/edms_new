/**
 * Notification Query Factories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationRepository } from './notification.repository';
import type { Notification, NotificationFilter, CreateNotificationInput } from '../model/notification';
import { getCurrentUser } from '@/shared/lib/query-utils';
import { auditService, AuditAction } from '@/shared/lib/audit.service';

export const notificationQueries = {
  all: () => ['notifications'] as const,
  lists: () => [...notificationQueries.all(), 'list'] as const,
  list: (filter: NotificationFilter) => [...notificationQueries.lists(), filter] as const,
  details: () => [...notificationQueries.all(), 'detail'] as const,
  detail: (id: string) => [...notificationQueries.details(), id] as const,
  forUser: (userId: string) => [...notificationQueries.all(), 'user', userId] as const,
  unreadForUser: (userId: string) => [...notificationQueries.all(), 'unread', userId] as const,
  countUnread: (userId: string) => [...notificationQueries.all(), 'unread-count', userId] as const,
};

export const useNotificationQueries = {
  useList: (filter: NotificationFilter) => {
    return useQuery({
      queryKey: notificationQueries.list(filter),
      queryFn: async () => notificationRepository.findWithFilters(filter),
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
    });
  },

  useById: (id: string | null) => {
    return useQuery({
      queryKey: notificationQueries.detail(id || ''),
      queryFn: async () => {
        if (!id) return null;
        return notificationRepository.findById(id);
      },
      enabled: !!id,
    });
  },

  useForUser: (userId: string) => {
    return useQuery({
      queryKey: notificationQueries.forUser(userId),
      queryFn: async () => notificationRepository.findForUser(userId),
      staleTime: 1000 * 60 * 1,
      refetchInterval: 1000 * 30, // Refetch every 30 seconds
    });
  },

  useUnreadForUser: (userId: string) => {
    return useQuery({
      queryKey: notificationQueries.unreadForUser(userId),
      queryFn: async () => notificationRepository.findUnreadForUser(userId),
      staleTime: 1000 * 60 * 1,
      refetchInterval: 1000 * 30,
    });
  },

  useCountUnread: (userId: string) => {
    return useQuery({
      queryKey: notificationQueries.countUnread(userId),
      queryFn: async () => notificationRepository.countUnreadForUser(userId),
      staleTime: 1000 * 60,
      refetchInterval: 1000 * 30,
    });
  },
};

export const useNotificationMutations = {
  useCreate: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (input: CreateNotificationInput) => {
        return notificationRepository.createNotification(input);
      },
      onSuccess: async (notification) => {
        queryClient.invalidateQueries({
          queryKey: notificationQueries.forUser(notification.userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.countUnread(notification.userId),
        });

        const user = await getCurrentUser();
        await auditService.notification(
          {
            userId: user.id,
            organizationId: notification.organizationId,
            timestamp: new Date().toISOString(),
          },
          AuditAction.NOTIFICATION_CREATED,
          notification.id,
          { title: notification.title }
        );
      },
    });
  },

  useMarkAsRead: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (notificationId: string) => {
        return notificationRepository.markAsRead(notificationId);
      },
      onSuccess: async (notification) => {
        queryClient.invalidateQueries({
          queryKey: notificationQueries.detail(notification.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.forUser(notification.userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.unreadForUser(notification.userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.countUnread(notification.userId),
        });
      },
    });
  },

  useMarkAsUnread: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (notificationId: string) => {
        return notificationRepository.markAsUnread(notificationId);
      },
      onSuccess: async (notification) => {
        queryClient.invalidateQueries({
          queryKey: notificationQueries.detail(notification.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.forUser(notification.userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.unreadForUser(notification.userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.countUnread(notification.userId),
        });
      },
    });
  },

  useMarkAllAsRead: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (userId: string) => {
        return notificationRepository.markAllAsRead(userId);
      },
      onSuccess: async (_, userId) => {
        queryClient.invalidateQueries({
          queryKey: notificationQueries.forUser(userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.unreadForUser(userId),
        });
        queryClient.invalidateQueries({
          queryKey: notificationQueries.countUnread(userId),
        });
      },
    });
  },

  useDelete: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (notificationId: string) => {
        await notificationRepository.deleteNotification(notificationId);
        return notificationId;
      },
      onSuccess: async (notificationId) => {
        queryClient.invalidateQueries({
          queryKey: notificationQueries.lists(),
        });
        queryClient.removeQueries({
          queryKey: notificationQueries.detail(notificationId),
        });
      },
    });
  },
};
