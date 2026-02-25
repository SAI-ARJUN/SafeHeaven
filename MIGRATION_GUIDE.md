# 🚀 SafeHaven - Complete Migration Guide

## From: Supabase + Mapbox
## To: Node.js + MongoDB + Socket.io + Leaflet (100% Free)

---

## ✅ What's Done:

### Backend (Complete):
- ✅ MongoDB models (Profile, Alert, DangerZone)
- ✅ Express server with Socket.io
- ✅ Real-time location tracking
- ✅ Emergency alerts via Socket.io
- ✅ All API routes

### Frontend (Installed):
- ✅ Leaflet.js (free maps)
- ✅ Socket.io client
- ✅ React Leaflet components

---

## 📝 Files to Create/Update:

### 1. Create Socket Context

**File: `src/contexts/SocketContext.tsx`**

```typescript
import React, { createContext, useContext, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface SocketContextType {
  socket: Socket;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = React.useState<Socket>();
  const [connected, setConnected] = React.useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socket!, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
```

---

### 2. Create Leaflet Map Component

**File: `src/components/LeafletMap.tsx`**

```typescript
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface UserLocation {
  touristId: string;
  username: string;
  lat: number;
  lng: number;
  status: 'safe' | 'alert' | 'danger';
}

interface DangerZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  level: string;
}

interface LeafletMapProps {
  userLocations?: UserLocation[];
  dangerZones?: DangerZone[];
  currentUserLocation?: { lat: number; lng: number } | null;
  isAdmin?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  userLocations = [],
  dangerZones = [],
  currentUserLocation,
  isAdmin = false
}) => {
  const defaultCenter: [number, number] = [11.08344, 76.99720]; // Saravanampatti
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return '#22c55e';
      case 'alert': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getZoneColor = (level: string) => {
    switch (level) {
      case 'low': return '#fbbf24';
      case 'medium': return '#f97316';
      case 'high': return '#ef4444';
      case 'critical': return '#7f1d1d';
      default: return '#ef4444';
    }
  };

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      {/* OpenStreetMap - 100% Free! */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Current User Location */}
      {currentUserLocation && (
        <Marker position={[currentUserLocation.lat, currentUserLocation.lng]}>
          <Popup>
            <div className="p-2">
              <p className="font-semibold">Your Location</p>
              <p className="text-xs text-muted-foreground">
                {currentUserLocation.lat.toFixed(4)}, {currentUserLocation.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Other Users (Admin View) */}
      {isAdmin && userLocations.map((user) => (
        <Marker 
          key={user.touristId} 
          position={[user.lat, user.lng]}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <p className="font-semibold">{user.username}</p>
              <p className="text-xs text-muted-foreground mb-2">{user.touristId}</p>
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStatusColor(user.status) }}
                />
                <span className="text-xs uppercase font-bold">{user.status}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Danger Zones */}
      {dangerZones.map((zone) => (
        <CircleMarker
          key={zone.id}
          center={[zone.lat, zone.lng]}
          radius={zone.radius / 10} // Scale down for better visibility
          pathOptions={{
            color: getZoneColor(zone.level),
            fillColor: getZoneColor(zone.level),
            fillOpacity: 0.3,
            weight: 2
          }}
        >
          <Tooltip>
            <div>
              <p className="font-semibold">{zone.name}</p>
              <p className="text-xs">{zone.level.toUpperCase()} Risk</p>
              <p className="text-xs">Radius: {zone.radius}m</p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};
```

---

### 3. Create Backend API Client

**File: `src/lib/api.ts`**

```typescript
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

export const api = {
  auth: {
    login: (tourist_id: string) => apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tourist_id }),
    }),
    loginWithWallet: (wallet_address: string) => apiCall('/auth/login/wallet', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
    register: (data: any) => apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  profiles: {
    getAll: () => apiCall('/profiles'),
    getByTouristId: (tourist_id: string) => apiCall(`/profiles/${tourist_id}`),
    update: (tourist_id: string, data: any) => apiCall(`/profiles/${tourist_id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  alerts: {
    getAll: () => apiCall('/alerts'),
    create: (data: any) => apiCall('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    dismiss: (id: string) => apiCall(`/alerts/${id}/dismiss`, {
      method: 'PUT',
    }),
  },

  locations: {
    getAll: () => apiCall('/locations'),
    update: (data: any) => apiCall('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  dangerZones: {
    getAll: () => apiCall('/zones'),
    create: (data: any) => apiCall('/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiCall(`/zones/${id}`, {
      method: 'DELETE',
    }),
  },
};
```

---

### 4. Update App.tsx

Add SocketProvider:

```typescript
import { SocketProvider } from '@/contexts/SocketContext';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <AuthProvider>
        <SocketProvider>  {/* Add this */}
          <TooltipProvider>
            {/* ... routes ... */}
          </TooltipProvider>
        </SocketProvider>
      </AuthProvider>
    </WalletProvider>
  </QueryClientProvider>
);
```

---

### 5. Update User Dashboard

Replace Mapbox with Leaflet and add Socket.io:

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { LeafletMap } from '@/components/LeafletMap';

// In component:
const { socket, connected } = useSocket();

// Connect to socket and send location
useEffect(() => {
  if (!socket || !user) return;

  socket.emit('user_join', user.touristId);

  const watchId = navigator.geolocation.watchPosition((pos) => {
    const locationData = {
      touristId: user.touristId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      status: user.status
    };

    // Send via Socket.io (real-time)
    socket.emit('location_update', locationData);

    // Also save to database
    api.locations.update(locationData);
  });

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}, [socket, user]);

// Replace MapboxMap with:
<LeafletMap
  currentUserLocation={location}
  dangerZones={mapDangerZones}
/>
```

---

### 6. Update Admin Dashboard

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { LeafletMap } from '@/components/LeafletMap';

// In component:
const { socket, connected } = useSocket();

// Listen for real-time updates
useEffect(() => {
  if (!socket) return;

  socket.emit('admin_join');

  socket.on('admin_location_update', (data) => {
    setUserLocations(prev => {
      const existing = prev.findIndex(l => l.touristId === data.touristId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = data;
        return updated;
      }
      return [...prev, data];
    });
  });

  socket.on('admin_emergency_alert', (data) => {
    toast({
      title: '🚨 Emergency!',
      description: `${data.username} needs help!`,
      variant: 'destructive'
    });
  });

  return () => {
    socket.off('admin_location_update');
    socket.off('admin_emergency_alert');
  };
}, [socket]);

// Replace MapboxMap with:
<LeafletMap
  userLocations={mapLocations}
  dangerZones={mapDangerZones}
  isAdmin={true}
/>
```

---

## 🎯 Final Steps:

### 1. Install Backend Dependencies:
```bash
cd backend
npm install
```

### 2. Start MongoDB:
- Windows: MongoDB runs automatically as service
- Mac: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

### 3. Start Backend:
```bash
cd backend
npm run dev
```

### 4. Start Frontend:
```bash
npm run dev
```

---

## ✅ Benefits:

1. **100% Free** - No Mapbox, no Supabase costs
2. **Real-time** - Socket.io instant updates
3. **Self-hosted** - Full control over data
4. **Scalable** - MongoDB + Socket.io scale well
5. **Open Source** - No vendor lock-in

---

## 🐛 Troubleshooting:

**MongoDB Connection Error:**
```bash
# Check if MongoDB is running
mongosh
# If error, start MongoDB service
```

**Socket.io Connection Error:**
```bash
# Check backend is running on port 3001
# Check CORS settings in server.js
```

**Leaflet Map Not Showing:**
```bash
# Make sure you imported CSS
import 'leaflet/dist/leaflet.css';
```

---

Ready to implement! 🚀
