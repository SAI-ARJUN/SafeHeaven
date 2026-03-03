import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

interface Location {
  id: number;
  profile_id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface UseRealtimeLocationsOptions {
  onLocationUpdate?: (location: Location) => void;
  onLocationsLoaded?: (locations: Location[]) => void;
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useRealtimeLocations({
  onLocationUpdate,
  onLocationsLoaded,
  enabled = true,
  refreshInterval = 3000, // Default: poll every 3 seconds for real-time tracking
}: UseRealtimeLocationsOptions = {}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const lastKnownLocationsRef = useRef<Map<number, Location>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    const fetchLocations = async () => {
      try {
        const data = await api.locations.getAll();
        const newLocations = data || [];
        
        // Check for new or updated locations
        newLocations.forEach((location: Location) => {
          const lastKnown = lastKnownLocationsRef.current.get(location.id);
          
          // If it's a new location or has been updated
          if (!lastKnown || location.timestamp !== lastKnown.timestamp) {
            onLocationUpdate?.(location);
            lastKnownLocationsRef.current.set(location.id, location);
          }
        });
        
        setLocations(newLocations);
        onLocationsLoaded?.(newLocations);
      } catch (error) {
        console.error('Location poll error:', error);
      }
    };

    // Initial fetch
    fetchLocations();

    // Poll for updates at regular intervals for real-time tracking
    const intervalId = setInterval(fetchLocations, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, refreshInterval]);

  return { locations };
}
