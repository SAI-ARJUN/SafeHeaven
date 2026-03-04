import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type AdminNotification = Tables<'admin_notifications'>;

interface UseRealtimeNotificationsOptions {
    touristId: string;
    enabled?: boolean;
}

export function useRealtimeNotifications({
    touristId,
    enabled = true,
}: UseRealtimeNotificationsOptions) {
    const { toast } = useToast();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial fetch
    useEffect(() => {
        if (!enabled || !touristId) return;

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('admin_notifications')
                .select('*')
                .eq('tourist_id', touristId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            setNotifications(data || []);
            setUnreadCount((data || []).filter(n => !n.read).length);
        };

        fetchNotifications();

        // Subscribe to realtime
        const channel = supabase
            .channel('admin-notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_notifications',
                    filter: `tourist_id=eq.${touristId}`,
                },
                (payload) => {
                    const newNotification = payload.new as AdminNotification;
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show toast based on notification type
                    const typeIcons: Record<string, string> = {
                        danger: '🚨',
                        evacuation: '🏃',
                        warning: '⚠️',
                        info: 'ℹ️',
                    };
                    const icon = typeIcons[newNotification.notification_type || 'warning'] || '⚠️';

                    toast({
                        title: `${icon} Admin Alert`,
                        description: newNotification.message,
                        variant: newNotification.notification_type === 'danger' || newNotification.notification_type === 'evacuation'
                            ? 'destructive'
                            : 'default',
                    });
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [enabled, touristId, toast]);

    const markAsRead = async (id: string) => {
        await supabase
            .from('admin_notifications')
            .update({ read: true })
            .eq('id', id);

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        await supabase
            .from('admin_notifications')
            .update({ read: true })
            .eq('tourist_id', touristId)
            .eq('read', false);

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllRead,
    };
}
