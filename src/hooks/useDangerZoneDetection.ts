import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DangerZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  level: string;
}

interface UserLocation {
  lat: number;
  lng: number;
}

// Calculate distance between two points in meters (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useDangerZoneDetection = (
  userLocation: UserLocation | null,
  touristId: string,
  username: string,
  userId?: string
) => {
  const { toast } = useToast();
  const notifiedZonesRef = useRef<Set<string>>(new Set());
  const adminNotifiedRef = useRef<Set<string>>(new Set());
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [nearestZone, setNearestZone] = useState<{ zone: DangerZone; distance: number } | null>(null);

  // Fetch danger zones from Supabase
  useEffect(() => {
    const fetchZones = async () => {
      const { data, error } = await supabase
        .from('danger_zones')
        .select('*');

      if (error) {
        console.error('Error fetching danger zones:', error);
        return;
      }

      setDangerZones(data || []);
    };

    fetchZones();

    // Also subscribe to realtime changes so new zones are picked up
    const channel = supabase
      .channel('danger-zones-detection')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'danger_zones',
      }, () => {
        fetchZones();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check proximity to danger zones
  useEffect(() => {
    if (!userLocation || dangerZones.length === 0) return;

    let closestZone: { zone: DangerZone; distance: number } | null = null;

    dangerZones.forEach((zone) => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        zone.lat,
        zone.lng
      );

      // Track closest zone
      if (!closestZone || distance < closestZone.distance) {
        closestZone = { zone, distance };
      }

      const isInZone = distance <= zone.radius;
      const isNearZone = distance <= zone.radius * 1.5;
      const zoneKey = `${touristId}-${zone.id}`;

      if (isInZone && !notifiedZonesRef.current.has(zoneKey)) {
        notifiedZonesRef.current.add(zoneKey);

        // Notify tourist
        toast({
          title: `🚨 Danger Zone Alert!`,
          description: `You have entered ${zone.name} (${(zone.level || 'medium').toUpperCase()} risk area). Stay alert and follow safety guidelines.`,
          variant: 'destructive',
        });

        // Create alert in Supabase for admin dashboard
        if (!adminNotifiedRef.current.has(zoneKey)) {
          adminNotifiedRef.current.add(zoneKey);

          // Insert alert into Supabase alerts table
          const insertAlert = async () => {
            const { error } = await supabase
              .from('alerts')
              .insert({
                user_id: userId || touristId,
                tourist_id: touristId,
                username,
                status: 'danger',
                lat: userLocation.lat,
                lng: userLocation.lng,
                zone_name: zone.name,
                zone_level: zone.level || 'medium',
                alert_type: 'entered_danger_zone',
                dismissed: false,
              });

            if (error) {
              console.error('Error creating danger zone alert:', error);
            }
          };

          insertAlert();
        }
      } else if (isNearZone && !isInZone && !notifiedZonesRef.current.has(`near-${zoneKey}`)) {
        notifiedZonesRef.current.add(`near-${zoneKey}`);

        toast({
          title: `⚠️ Approaching Danger Zone`,
          description: `You are near ${zone.name}. Proceed with caution.`,
        });
      } else if (!isInZone && notifiedZonesRef.current.has(zoneKey)) {
        // User left the zone
        notifiedZonesRef.current.delete(zoneKey);
        notifiedZonesRef.current.delete(`near-${zoneKey}`);

        toast({
          title: '✅ Left Danger Zone',
          description: `You have left ${zone.name}`,
        });
      }
    });

    setNearestZone(closestZone);
  }, [userLocation, dangerZones, touristId, username, userId, toast]);

  return {
    nearestZone,
    dangerZones,
    clearNotifications: () => {
      notifiedZonesRef.current.clear();
      adminNotifiedRef.current.clear();
    },
  };
};
