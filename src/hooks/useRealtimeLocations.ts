import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type UserLocation = Tables<'user_locations'>;

interface UseRealtimeLocationsOptions {
  onLocationUpdate?: (location: UserLocation) => void;
  enabled?: boolean;
}

export function useRealtimeLocations({
  onLocationUpdate,
  enabled = true,
}: UseRealtimeLocationsOptions = {}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('locations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
        },
        (payload) => {
          const location = payload.new as UserLocation;
          onLocationUpdate?.(location);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled, onLocationUpdate]);

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}
