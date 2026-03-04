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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize alert sound
  useEffect(() => {
    // Create a simple beep sound using AudioContext
    audioRef.current = null;
    
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const playAlertSound = () => {
    // Use browser AudioContext for alert sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Play twice for urgency
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 800;
        osc2.type = 'square';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 600);
    } catch (error) {
      console.error('Failed to play alert sound:', error);
    }
  };

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

          // Play alert sound for emergencies
          if (newAlert.status === 'danger' || newAlert.alert_type === 'emergency') {
            playAlertSound();
          }

          // Show toast notification
          if (newAlert.alert_type === 'entered_danger_zone') {
            toast({
              title: '🚨 Danger Zone Alert!',
              description: `${newAlert.username} entered ${newAlert.zone_name} (${newAlert.zone_level} risk)`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: `⚠️ Status Alert: ${newAlert.username}`,
              description: `${newAlert.username} changed status to ${newAlert.status.toUpperCase()}`,
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
