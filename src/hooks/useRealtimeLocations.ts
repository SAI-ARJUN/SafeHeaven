import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type UserLocation = Tables<'user_locations'>;

interface UseRealtimeLocationsOptions {
  onLocationUpdate?: (location: UserLocation) => void;
  onLocationsLoaded?: (locations: UserLocation[]) => void;
  enabled?: boolean;
}

export function useRealtimeLocations({
  onLocationUpdate,
  onLocationsLoaded,
  enabled = true,
}: UseRealtimeLocationsOptions = {}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // -------- INITIAL FETCH
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*');

      if (error) {
        console.error('Location fetch error:', error);
        return;
      }

      if (data) {
        onLocationsLoaded?.(data);
        loadedRef.current = true;
      }
    };

    fetchInitial();

    // -------- REALTIME SUBSCRIBE
    const channel = supabase
      .channel('locations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_locations',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            // Handle delete if needed
            return;
          }
          onLocationUpdate?.(payload.new as UserLocation);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Location realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Location realtime subscription error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log('🔌 Location realtime subscription cleaned up');
      }
    };
  }, [enabled]);

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}
