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
      }
    };

    fetchInitial();

    // -------- REALTIME SUBSCRIBE
    const channel = supabase
      .channel('locations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_locations',
        },
        (payload) => {
          onLocationUpdate?.(payload.new as UserLocation);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_locations',
        },
        (payload) => {
          onLocationUpdate?.(payload.new as UserLocation);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
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
