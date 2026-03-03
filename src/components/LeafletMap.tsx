import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DangerZone {
  id: string | number;
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

interface Props {
  dangerZones?: DangerZone[];
  userLocations?: UserLocation[];
  currentUserLocation?: { lat: number; lng: number; status?: 'safe' | 'alert' | 'danger' } | null;
  showDangerZones?: boolean;
  showUserMarkers?: boolean;
  isAdmin?: boolean;
}

const STATUS_CONFIG = {
  safe: { color: '#22c55e', glow: '#22c55e80', label: 'SAFE', emoji: '✅', bg: '#052e16' },
  alert: { color: '#f59e0b', glow: '#f59e0b80', label: 'ALERT', emoji: '⚠️', bg: '#451a03' },
  danger: { color: '#ef4444', glow: '#ef444480', label: 'DANGER', emoji: '🚨', bg: '#450a0a' },
};

/** Creates a Snapchat-style floating name badge element */
function createSnapMarker(username: string, status: 'safe' | 'alert' | 'danger'): HTMLDivElement {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.safe;
  const initials = username.slice(0, 2).toUpperCase();

  const wrapper = document.createElement('div');
  wrapper.className = 'snap-marker-wrapper';
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    filter: drop-shadow(0 4px 12px ${cfg.glow});
  `;

  // ── Name card (top) ──
  const card = document.createElement('div');
  card.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(10,10,20,0.92);
    border: 1.5px solid ${cfg.color};
    border-radius: 20px;
    padding: 4px 10px 4px 4px;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    transition: transform 0.15s ease;
    max-width: 160px;
  `;

  // Avatar circle with initials
  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${cfg.color}, ${cfg.glow});
    border: 2px solid ${cfg.color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.5px;
  `;
  avatar.textContent = initials;

  // Name text
  const nameEl = document.createElement('span');
  nameEl.style.cssText = `
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    font-family: 'Inter', sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 110px;
  `;
  nameEl.textContent = username;

  card.appendChild(avatar);
  card.appendChild(nameEl);

  // ── Connector line ──
  const line = document.createElement('div');
  line.style.cssText = `
    width: 2px;
    height: 8px;
    background: ${cfg.color};
    opacity: 0.8;
  `;

  // ── Status dot (bottom) ──
  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${cfg.color};
    border: 2.5px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 6px ${cfg.color};
  `;

  if (status === 'alert' || status === 'danger') {
    dot.style.animation = 'snap-pulse 1.4s ease-in-out infinite';
    card.style.animation = 'snap-card-pulse 1.4s ease-in-out infinite';
  }

  wrapper.appendChild(card);
  wrapper.appendChild(line);
  wrapper.appendChild(dot);

  return wrapper;
}

/** Creates a colored ring marker for current user location */
function createUserLocationMarker(status: 'safe' | 'alert' | 'danger'): HTMLDivElement {
  const statusConfig = STATUS_CONFIG[status];
  
  const el = document.createElement('div');
  el.style.cssText = `
    width: 24px; height: 24px; border-radius: 50%;
    background: ${statusConfig.color};
    border: 3px solid white;
    box-shadow: 0 0 0 6px ${statusConfig.glow};
    animation: snap-pulse 2s ease-in-out infinite;
    cursor: pointer;
  `;
  
  return el;
}

const LeafletMap: React.FC<Props> = ({
  dangerZones = [],
  userLocations = [],
  currentUserLocation,
  showDangerZones = true,
  showUserMarkers = true,
  isAdmin = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const [ready, setReady] = useState(false);

  // ── MAP INIT ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center on current user location if available, otherwise default to India
    const defaultCenter: [number, number] = currentUserLocation
      ? [currentUserLocation.lat, currentUserLocation.lng]
      : [20.5937, 78.9629];
    const defaultZoom = currentUserLocation ? 15 : 4;

    // Initialize Leaflet map with OpenStreetMap tiles
    mapRef.current = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles (dark theme alternative using CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(mapRef.current);

    setReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [currentUserLocation]);

  // ── CENTER MAP ON CURRENT USER LOCATION CHANGE ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentUserLocation) return;

    // Smooth fly to user location when it changes
    map.flyTo([currentUserLocation.lat, currentUserLocation.lng], 15, {
      duration: 2,
    });
  }, [currentUserLocation]);

  // ── DANGER ZONES ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showDangerZones || !ready) return;

    // Clear existing zones
    circlesRef.current.forEach((circle) => map.removeLayer(circle));
    circlesRef.current = [];

    dangerZones.forEach((zone) => {
      const zoneConfig = {
        high: { color: '#ef4444', opacity: 0.35, fillColor: '#ef4444' },
        medium: { color: '#f97316', opacity: 0.25, fillColor: '#f97316' },
        low: { color: '#eab308', opacity: 0.15, fillColor: '#eab308' },
      };
      const cfg = zoneConfig[zone.level] || zoneConfig.medium;

      // Create main danger zone circle
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: cfg.color,
        fillColor: cfg.fillColor,
        fillOpacity: cfg.opacity,
        weight: 2,
        opacity: 0.8,
      }).addTo(map);

      // Create buffer zone (1.5x radius)
      const bufferCircle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius * 1.5,
        color: cfg.color,
        fillColor: cfg.fillColor,
        fillOpacity: cfg.opacity * 0.3,
        weight: 1,
        opacity: 0.5,
        dashArray: '4, 4',
      }).addTo(map);

      // Add label
      const label = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({
          className: 'danger-zone-label',
          html: `<div style="
            background: rgba(0,0,0,0.8);
            border: 1px solid ${cfg.color};
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            white-space: nowrap;
            backdrop-filter: blur(4px);
          ">${zone.name}</div>`,
          iconSize: [100, 30],
          iconAnchor: [50, 15],
        }),
      }).addTo(map);

      circlesRef.current.push(circle, bufferCircle, label);
    });
  }, [dangerZones, showDangerZones, ready]);

  // ── USER MARKERS (Snapchat style) ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    // Show other users' markers only if showUserMarkers is true (for admin)
    if (showUserMarkers) {
      userLocations.forEach((user) => {
        if (!user.lat || !user.lng) return;

        const el = createSnapMarker(user.username || user.touristId, user.status);

        // Create popup with user info
        const popup = L.popup({
          offset: [0, -40],
          maxWidth: 240,
          autoClose: false,
          closeOnClick: false,
        }).setContent(`
          <div style="font-family:'Inter',sans-serif; padding:8px 4px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <div style="width:34px; height:34px; border-radius:50%; background:${STATUS_CONFIG[user.status]?.bg}; border:2px solid ${STATUS_CONFIG[user.status]?.color}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; color:${STATUS_CONFIG[user.status]?.color};">
                ${(user.username || user.touristId).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:700; font-size:14px; color:#fff;">${user.username || user.touristId}</div>
                <div style="font-size:10px; color:#888; font-family:monospace;">${user.touristId}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:10px; background:${STATUS_CONFIG[user.status]?.bg}; border:1.5px solid ${STATUS_CONFIG[user.status]?.color}40; margin-bottom:6px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${STATUS_CONFIG[user.status]?.color}; box-shadow:0 0 6px ${STATUS_CONFIG[user.status]?.color};"></div>
              <span style="font-weight:800; font-size:13px; color:${STATUS_CONFIG[user.status]?.color}; letter-spacing:0.5px;">
                ${STATUS_CONFIG[user.status]?.emoji} ${STATUS_CONFIG[user.status]?.label}
              </span>
              <span style="margin-left:auto; font-size:9px; color:${STATUS_CONFIG[user.status]?.color}; opacity:0.8;">LIVE</span>
            </div>
            <div style="font-size:11px; color:#888; display:flex; align-items:center; gap:4px;">
              📍 ${user.lat.toFixed(5)}, ${user.lng.toFixed(5)}
            </div>
          </div>
        `);

        const marker = L.marker([user.lat, user.lng], {
          icon: L.divIcon({
            className: 'user-marker',
            html: el.outerHTML,
            iconSize: [40, 60],
            iconAnchor: [20, 60],
            popupAnchor: [0, -60],
          }),
        }).bindPopup(popup);

        marker.addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Current user marker (colored ring based on status) - ALWAYS show for user dashboard
    if (currentUserLocation) {
      const userStatus = currentUserLocation.status || 'safe';
      const el = createUserLocationMarker(userStatus);

      const popup = L.popup({
        offset: [0, -30],
        autoClose: false,
        closeOnClick: false,
      }).setContent(`
        <div style="font-family:'Inter',sans-serif; padding:6px 8px; background:rgba(10,10,20,0.95); border-radius:12px; border:1.5px solid ${STATUS_CONFIG[userStatus]?.color};">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:12px; height:12px; border-radius:50%; background:${STATUS_CONFIG[userStatus]?.color}; box-shadow:0 0 8px ${STATUS_CONFIG[userStatus]?.color}; animation: snap-pulse 1s ease-in-out infinite;"></div>
            <strong style="color:#fff; font-size:13px;">${STATUS_CONFIG[userStatus]?.emoji} ${STATUS_CONFIG[userStatus]?.label}</strong>
          </div>
          <div style="font-size:11px; color:#888; margin-top:4px; font-family:monospace;">
            ${currentUserLocation.lat.toFixed(5)}, ${currentUserLocation.lng.toFixed(5)}
          </div>
        </div>
      `);

      const marker = L.marker([currentUserLocation.lat, currentUserLocation.lng], {
        icon: L.divIcon({
          className: 'current-user-marker',
          html: el.outerHTML,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        }),
      }).bindPopup(popup);

      marker.addTo(map);
      markersRef.current.push(marker);
    }
  }, [userLocations, currentUserLocation, showUserMarkers, ready]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ zIndex: 1 }}
      />

      {/* Map Legend */}
      {isAdmin && (
        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 border border-white/10 z-[1000]">
          <div className="font-semibold text-white/90 mb-2 text-[11px] uppercase tracking-wider">Legend</div>
          {[
            { color: '#ef4444', label: 'Danger Zone (High)' },
            { color: '#f97316', label: 'Caution Zone (Medium)' },
            { color: '#eab308', label: 'Low Risk Zone' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span style={{ background: color }} className="w-3 h-3 rounded-full border border-white/30 inline-block" />
              <span className="text-white/80">{label}</span>
            </div>
          ))}
          <div className="border-t border-white/10 my-1.5" />
          {[
            { color: '#22c55e', label: 'Tourist (Safe)' },
            { color: '#f59e0b', label: 'Tourist (Alert)' },
            { color: '#ef4444', label: 'Tourist (Danger)' },
            { color: '#3b82f6', label: 'Your Location' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span style={{ background: color }} className="w-3 h-3 rounded-full border border-white/30 inline-block" />
              <span className="text-white/80">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes snap-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.25); opacity: 0.75; }
        }
        @keyframes snap-card-pulse {
          0%, 100% { box-shadow: none; }
          50%       { box-shadow: 0 0 0 3px rgba(239,68,68,0.35); }
        }
        
        /* Leaflet marker styles */
        .snap-marker-wrapper, .user-marker, .current-user-marker {
          background: transparent;
          border: none;
        }
        
        .danger-zone-label {
          background: transparent;
          border: none;
        }
        
        /* Fix Leaflet popup styling */
        .leaflet-popup-content-wrapper {
          background: rgba(10, 10, 20, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }
        
        .leaflet-popup-tip {
          background: rgba(10, 10, 20, 0.95);
        }
        
        .leaflet-popup-content {
          margin: 12px;
          font-family: 'Inter', sans-serif;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default LeafletMap;
