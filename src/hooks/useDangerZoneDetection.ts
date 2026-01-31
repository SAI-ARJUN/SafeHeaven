import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DangerZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  level: 'low' | 'medium' | 'high';
}

interface UserLocation {
  lat: number;
  lng: number;
}

// Calculate distance between two points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
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
  userId: string,
  username: string
) => {
  const { toast } = useToast();
  const notifiedZonesRef = useRef<Set<string>>(new Set());
  const adminNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userLocation) return;

    const dangerZones: DangerZone[] = JSON.parse(localStorage.getItem('dangerZones') || '[]');

    dangerZones.forEach((zone) => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        zone.lat,
        zone.lng
      );

      const isInZone = distance <= zone.radius;
      const zoneKey = `${userId}-${zone.id}`;

      if (isInZone && !notifiedZonesRef.current.has(zoneKey)) {
        notifiedZonesRef.current.add(zoneKey);

        // Notify user
        toast({
          title: `⚠️ Danger Zone Alert!`,
          description: `You have entered ${zone.name} (${zone.level.toUpperCase()} risk area)`,
          variant: 'destructive',
        });

        // Create admin notification if not already notified for this session
        if (!adminNotifiedRef.current.has(zoneKey)) {
          adminNotifiedRef.current.add(zoneKey);
          
          const dangerAlerts = JSON.parse(localStorage.getItem('dangerZoneAlerts') || '[]');
          const alertId = `${zoneKey}-${Date.now()}`;
          
          dangerAlerts.push({
            id: alertId,
            touristId: userId,
            username,
            zoneName: zone.name,
            zoneLevel: zone.level,
            timestamp: new Date().toISOString(),
            location: userLocation,
            type: 'danger_zone_entry',
          });
          
          localStorage.setItem('dangerZoneAlerts', JSON.stringify(dangerAlerts));

          // Trigger notification for admin (simulated)
          console.log(`[ADMIN ALERT] User ${username} (${userId}) entered danger zone: ${zone.name}`);
        }
      } else if (!isInZone && notifiedZonesRef.current.has(zoneKey)) {
        // User left the zone
        notifiedZonesRef.current.delete(zoneKey);
        
        toast({
          title: '✅ Left Danger Zone',
          description: `You have left ${zone.name}`,
        });
      }
    });
  }, [userLocation, userId, username, toast]);

  return {
    clearNotifications: () => {
      notifiedZonesRef.current.clear();
      adminNotifiedRef.current.clear();
    },
  };
};
