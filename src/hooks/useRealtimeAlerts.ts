import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Alert = Tables<'alerts'>;

interface UseRealtimeAlertsOptions {
  onNewAlert?: (alert: Alert) => void;
  onAlertDismissed?: (alert: Alert) => void;
  enabled?: boolean;
}

export function useRealtimeAlerts({
  onNewAlert,
  onAlertDismissed,
  enabled = true,
}: UseRealtimeAlertsOptions = {}) {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Create realtime channel for alerts
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          
          // Show toast notification
          if (newAlert.alert_type === 'entered_danger_zone') {
            toast({
              title: '🚨 Danger Zone Alert!',
              description: `${newAlert.username} entered ${newAlert.zone_name} (${newAlert.zone_level} risk)`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: `⚠️ Status Alert: ${newAlert.status.toUpperCase()}`,
              description: `${newAlert.username} changed status to ${newAlert.status}`,
              variant: newAlert.status === 'danger' ? 'destructive' : 'default',
            });
          }

          onNewAlert?.(newAlert);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const updatedAlert = payload.new as Alert;
          if (updatedAlert.dismissed) {
            onAlertDismissed?.(updatedAlert);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, onNewAlert, onAlertDismissed, toast]);

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}
