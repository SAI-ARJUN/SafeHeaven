import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSendLocation(
  userId: string,
  touristId: string,
  status: 'safe' | 'alert' | 'danger'
) {
  const lastSentRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId || !touristId || userId.trim() === '' || touristId.trim() === '') return;

    const sendLocation = async (latitude: number, longitude: number) => {
      const now = Date.now();
      // Throttle: send at most once every 3 seconds for better real-time feel
      if (now - lastSentRef.current < 3000) return;
      lastSentRef.current = now;

      try {
        // Upsert: update if exists, insert if not
        const { error } = await supabase.from('user_locations').upsert({
          user_id: userId,
          tourist_id: touristId,
          lat: latitude,
          lng: longitude,
          status,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tourist_id', // Assuming unique constraint on tourist_id
        });

        if (error) {
          console.error('Location upsert error:', error);
        }
      } catch (err) {
        console.error('Location send error:', err);
      }
    };

    // Start high-accuracy GPS tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendLocation(latitude, longitude);
      },
      (err) => {
        console.error('GPS error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000, // Accept 1 second old positions
        timeout: 5000,    // Wait up to 5 seconds for GPS fix
      }
    );

    // Send initial location immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.error('Initial GPS error:', err)
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [userId, touristId, status]);
}
