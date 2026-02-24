import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSendLocation(
  userId: string,
  touristId: string,
  status: 'safe' | 'alert' | 'danger'
) {
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!userId || !touristId || userId.trim() === '' || touristId.trim() === '') return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        // Throttle: send at most once every 5 seconds
        const now = Date.now();
        if (now - lastSentRef.current < 5000) return;
        lastSentRef.current = now;

        const { latitude, longitude } = pos.coords;

        // Try update first, then insert if no row exists
        const { data: existing } = await supabase
          .from('user_locations')
          .select('id')
          .eq('tourist_id', touristId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('user_locations')
            .update({ lat: latitude, lng: longitude, status, updated_at: new Date().toISOString() })
            .eq('tourist_id', touristId);
          if (error) console.error('Location update error:', JSON.stringify(error));
        } else {
          const { error } = await supabase
            .from('user_locations')
            .insert({ user_id: userId, tourist_id: touristId, lat: latitude, lng: longitude, status, updated_at: new Date().toISOString() });
          if (error) console.error('Location insert error:', JSON.stringify(error));
        }
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userId, touristId, status]);
}
