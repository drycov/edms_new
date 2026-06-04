import { Bell, CheckCheck, Trash2, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/shared/lib/utils';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { toast } from '@/shared/ui/toaster';
import { useNotificationQueries, useNotificationMutations } from '@/entities/notification';
import { getCurrentUser } from '@/shared/lib/query-utils';

export function NotificationsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.id);
      } catch (error) {
        console.error('Failed to get current user:', error);
      }
    })();
  }, []);

  const { data: notifications, isLoading } = useNotificationQueries.useForUser(userId);
  const markAsRead = useNotificationMutations.useMarkAsRead();
  const markAllAsRead = useNotificationMutations.useMarkAllAsRead();
  const deleteNotification = useNotificationMutations.useDelete();

  const handleMarkAllAsRead = () => {
    if (!userId) return;
    markAllAsRead.mutate(userId, {
      onSuccess: () => {
        toast.success(t('common.success'), t('notifications.markAllRead'));
      },
    });
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id, {
      onSuccess: () => {
        // Invalidation happens automatically in the mutation
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id, {
      onSuccess: () => {
        toast.success(t('common.success'), t('common.delete'));
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

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

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
                notification.isRead ? 'bg-gray-50' : 'bg-white border-blue-200'
              }`}
              onClick={() => {
                if (!notification.isRead) {
                  handleMarkAsRead(notification.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notificationType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <Badge variant="default" className="text-xs">{t('common.info')}</Badge>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-sm text-gray-500 mb-2">{notification.message}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDate(notification.createdAt, 'relative')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {notification.actionUrl && (
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
