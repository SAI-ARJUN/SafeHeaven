import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface DangerZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  level: 'low' | 'medium' | 'high';
}

interface UserLocation {
  touristId: string;
  username: string;
  lat: number;
  lng: number;
  status: 'safe' | 'alert' | 'danger';
}

interface MapboxMapProps {
  dangerZones?: DangerZone[];
  userLocations?: UserLocation[];
  currentUserLocation?: { lat: number; lng: number } | null;
  showDangerZones?: boolean;
  showUserMarkers?: boolean;
  isAdmin?: boolean;
  onZoneClick?: (zone: DangerZone) => void;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  dangerZones = [],
  userLocations = [],
  currentUserLocation,
  showDangerZones = true,
  showUserMarkers = true,
  isAdmin = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>(
    localStorage.getItem('mapboxToken') || ''
  );
  const [isTokenSet, setIsTokenSet] = useState<boolean>(!!localStorage.getItem('mapboxToken'));

  const saveToken = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapboxToken', mapboxToken.trim());
      setIsTokenSet(true);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: currentUserLocation ? [currentUserLocation.lng, currentUserLocation.lat] : [78.9629, 20.5937],
      zoom: currentUserLocation ? 14 : 4,
      pitch: 45,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(20, 20, 30)',
        'high-color': 'rgb(50, 50, 80)',
        'horizon-blend': 0.2,
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken]);

  // Update danger zones
  useEffect(() => {
    if (!map.current || !showDangerZones) return;

    map.current.on('load', () => {
      dangerZones.forEach((zone) => {
        const sourceId = `danger-zone-${zone.id}`;
        const layerId = `danger-zone-layer-${zone.id}`;
        const extrusionLayerId = `danger-zone-extrusion-${zone.id}`;

        if (map.current?.getSource(sourceId)) {
          map.current.removeLayer(layerId);
          map.current.removeLayer(extrusionLayerId);
          map.current.removeSource(sourceId);
        }

        const color = zone.level === 'high' ? '#ef4444' : zone.level === 'medium' ? '#f97316' : '#eab308';

        // Create circle polygon
        const center = [zone.lng, zone.lat];
        const radiusInKm = zone.radius / 1000;
        const points = 64;
        const coords = [];

        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const dx = radiusInKm * Math.cos(angle);
          const dy = radiusInKm * Math.sin(angle);
          const lat = center[1] + (dy / 110.574);
          const lng = center[0] + (dx / (111.320 * Math.cos(center[1] * Math.PI / 180)));
          coords.push([lng, lat]);
        }
        coords.push(coords[0]);

        map.current?.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name, level: zone.level },
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
          },
        });

        // 2D circle layer
        map.current?.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.3,
          },
        });

        // 3D extrusion for danger zones
        map.current?.addLayer({
          id: extrusionLayerId,
          type: 'fill-extrusion',
          source: sourceId,
          paint: {
            'fill-extrusion-color': color,
            'fill-extrusion-height': zone.level === 'high' ? 500 : zone.level === 'medium' ? 300 : 150,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.6,
          },
        });
      });
    });
  }, [dangerZones, showDangerZones]);

  // Update user markers
  useEffect(() => {
    if (!map.current || !showUserMarkers) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    userLocations.forEach((user) => {
      const el = document.createElement('div');
      el.className = 'user-marker';
      el.innerHTML = `
        <div class="relative">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${
            user.status === 'safe' ? 'bg-green-500' : user.status === 'alert' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
          }">
            ${user.username.charAt(0).toUpperCase()}
          </div>
          ${user.status === 'danger' ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>' : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2 bg-background text-foreground">
          <p class="font-semibold">${user.username}</p>
          <p class="text-xs text-muted-foreground">${user.touristId}</p>
          <p class="text-xs mt-1 ${user.status === 'safe' ? 'text-green-500' : user.status === 'alert' ? 'text-yellow-500' : 'text-red-500'}">
            Status: ${user.status.toUpperCase()}
          </p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([user.lng, user.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add current user marker
    if (currentUserLocation) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([currentUserLocation.lng, currentUserLocation.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);

      map.current.flyTo({
        center: [currentUserLocation.lng, currentUserLocation.lat],
        zoom: 14,
      });
    }
  }, [userLocations, currentUserLocation, showUserMarkers]);

  if (!isTokenSet) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-xl p-8">
        <div className="max-w-md text-center">
          <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">Enter Mapbox Token</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get your public token from{' '}
            <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              mapbox.com
            </a>
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="bg-muted/50"
            />
            <Button onClick={saveToken} className="btn-gradient">
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10 rounded-xl" />
    </div>
  );
};

export default MapboxMap;
