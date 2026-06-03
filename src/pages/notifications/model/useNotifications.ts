import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUser } from '@/shared/lib/query-utils';
import type { Notification } from './types';

export function useNotifications(filter: 'all' | 'unread' | 'read') {
  return useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const user = await getCurrentUser();

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'read') {
        query = query.eq('is_read', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useMarkNotificationAsRead() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  return useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
  });
}

export function useDeleteNotification() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
  });
}
