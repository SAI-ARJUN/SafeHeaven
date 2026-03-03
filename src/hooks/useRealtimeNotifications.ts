import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AdminNotification {
  id: number;
  profile_id: number;
  message: string;
  read: boolean;
  created_at: string;
}

interface UseRealtimeNotificationsOptions {
  touristId: string;
  enabled?: boolean;
}

export function useRealtimeNotifications({
  touristId,
  enabled = true,
}: UseRealtimeNotificationsOptions) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotificationIdRef = useState<number>(0);

  // Initial fetch
  useEffect(() => {
    if (!enabled || !touristId) return;

    const fetchNotifications = async () => {
      try {
        const data = await api.notifications.getAll();
        const filteredData = (data || []).filter((n: AdminNotification) => {
          // Filter by touristId if profile_id matches
          return true; // For now, show all notifications
        });
        
        setNotifications(filteredData);
        setUnreadCount(filteredData.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Poll for updates every 5 seconds (replaces realtime subscriptions)
    const intervalId = setInterval(async () => {
      try {
        const data = await api.notifications.getAll();
        const newNotifications = data || [];
        
        // Check for new notifications
        newNotifications.forEach((notification: AdminNotification) => {
          if (notification.id > lastNotificationIdRef[0]) {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show toast based on notification content
            const icon = '⚠️';

            toast({
              title: `${icon} Admin Alert`,
              description: notification.message,
              variant: 'default',
            });
            
            lastNotificationIdRef[0] = notification.id;
          }
        });
      } catch (error) {
        console.error('Notification poll error:', error);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, touristId, toast]);

  const markAsRead = async (id: number) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;

      for (const notification of unread) {
        await api.notifications.markRead(notification.id);
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
  };
}
