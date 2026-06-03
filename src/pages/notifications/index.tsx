import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { toast } from '@/shared/ui/toaster';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from './model/useNotifications';

export function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data: notifications, isLoading } = useNotifications(filter);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast.success(t('common.success'), t('notifications.markAllRead'));
      },
    });
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_required':
      case 'signature_required':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'sla_warning':
      case 'sla_violation':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-gray-500 mt-1">{t('notifications.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              {t('common.all')}
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              {t('notifications.markAllRead')} ({unreadCount})
            </Button>
            <Button
              size="sm"
              variant={filter === 'read' ? 'default' : 'outline'}
              onClick={() => setFilter('read')}
            >
              {t('common.status')}
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : notifications?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Bell className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">{t('notifications.noNotifications')}</p>
          <p className="text-sm">{t('notifications.allCaughtUp')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications?.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors ${
                notification.is_read ? 'bg-gray-50' : 'bg-white border-blue-200'
              }`}
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkAsRead(notification.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <Badge variant="default" className="text-xs">{t('common.info')}</Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-gray-500 mb-2">{notification.message}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDate(notification.created_at, 'relative')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {notification.action_url && (
                      <Button size="sm" variant="outline">
                        {t('common.view')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
