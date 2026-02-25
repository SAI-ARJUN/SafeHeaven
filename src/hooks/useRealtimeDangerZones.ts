import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type DangerZone = Tables<'danger_zones'>;

interface UseRealtimeDangerZonesOptions {
  onZoneAdded?: (zone: DangerZone) => void;
  onZoneRemoved?: (zoneId: string) => void;
  onZonesLoaded?: (zones: DangerZone[]) => void;
  enabled?: boolean;
}

export function useRealtimeDangerZones({
  onZoneAdded,
  onZoneRemoved,
  onZonesLoaded,
  enabled = true,
}: UseRealtimeDangerZonesOptions = {}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Fetch initial zones
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('danger_zones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Danger zones fetch error:', error);
        return;
      }

      if (data) {
        onZonesLoaded?.(data);
      }
    };

    fetchInitial();

    // Create realtime channel for danger zones
    const channel = supabase
      .channel('danger-zones-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'danger_zones',
        },
        (payload) => {
          const newZone = payload.new as DangerZone;
          onZoneAdded?.(newZone);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'danger_zones',
        },
        (payload) => {
          onZoneRemoved?.(payload.old.id);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Danger zones realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Danger zones realtime subscription error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log('🔌 Danger zones realtime subscription cleaned up');
      }
    };
  }, [enabled, onZoneAdded, onZoneRemoved, onZonesLoaded]);

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}
