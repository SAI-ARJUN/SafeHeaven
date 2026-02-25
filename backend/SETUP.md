# SafeHeaven Backend - Complete Setup Guide

## 🚀 Full Stack: Node.js + MongoDB + Socket.io + Leaflet

### **Architecture:**
```
Frontend (React + Vite)
    ↓
Socket.io Client (Real-time)
    ↓
Backend (Node.js + Express + Socket.io)
    ↓
MongoDB (Database)
```

---

## Step 1: Install MongoDB

### Windows:
1. Download: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB runs as a service automatically

### OR Use MongoDB Atlas (Cloud - Free):
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string

---

## Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

---

## Step 3: Configure Environment

Edit `backend/.env`:

```env
# For Local MongoDB
MONGODB_URI=mongodb://localhost:27017/safeheaven

# OR For MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/safeheaven
```

---

## Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 3001
🔌 Socket.io: http://localhost:3001
```

---

## Step 5: Install Frontend Dependencies

```bash
# Install Leaflet (free maps)
npm install leaflet react-leaflet

# Install Socket.io client
npm install socket.io-client
```

---

## Step 6: Remove Supabase

Delete these files:
- `src/integrations/supabase/` folder
- `src/lib/api.ts`

Update these files to use new backend:
- `src/contexts/AuthContext.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/AdminDashboard.tsx`

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login with Tourist ID
- `POST /api/auth/login/wallet` - Login with wallet

### Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:id` - Get profile by tourist_id
- `PUT /api/profiles/:id` - Update profile

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create alert
- `PUT /api/alerts/:id/dismiss` - Dismiss alert

### Locations
- `GET /api/locations` - Get all locations
- `POST /api/locations` - Update location

### Danger Zones
- `GET /api/zones` - Get all zones
- `POST /api/zones` - Create zone
- `DELETE /api/zones/:id` - Delete zone

---

## Socket.io Events

### Client → Server:
```javascript
socket.emit('user_join', touristId);
socket.emit('admin_join');
socket.emit('location_update', { touristId, lat, lng, status });
socket.emit('emergency_alert', { touristId, username, lat, lng, type });
socket.emit('danger_zone_created', zoneData);
```

### Server → Client:
```javascript
socket.on('admin_location_update', (data) => { ... });
socket.on('admin_emergency_alert', (data) => { ... });
socket.on('new_danger_zone', (data) => { ... });
```

---

## Frontend Integration

### 1. Create Socket Context

```typescript
// src/contexts/SocketContext.tsx
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false
});

export function useSocket() {
  return { socket };
}
```

### 2. Create Leaflet Map Component

```typescript
// src/components/LeafletMap.tsx
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export function LeafletMap({ userLocations, dangerZones }) {
  return (
    <MapContainer center={[11.08344, 76.99720]} zoom={13} style={{ height: '400px' }}>
      {/* OpenStreetMap - Free! */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap contributors'
      />
      
      {/* User Markers */}
      {userLocations.map(user => (
        <Marker key={user.touristId} position={[user.lat, user.lng]}>
          <Popup>{user.username} - {user.status}</Popup>
        </Marker>
      ))}
      
      {/* Danger Zones */}
      {dangerZones.map(zone => (
        <CircleMarker
          key={zone.id}
          center={[zone.latitude, zone.longitude]}
          radius={zone.radius / 10}
        />
      ))}
    </MapContainer>
  );
}
```

### 3. Update User Dashboard

```typescript
// Track location and send via Socket.io
useEffect(() => {
  socket.connect();
  socket.emit('user_join', user.touristId);

  const watchId = navigator.geolocation.watchPosition((pos) => {
    socket.emit('location_update', {
      touristId: user.touristId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      status: user.status
    });
  });

  return () => {
    socket.disconnect();
    navigator.geolocation.clearWatch(watchId);
  };
}, []);
```

### 4. Update Admin Dashboard

```typescript
// Receive real-time updates
useEffect(() => {
  socket.connect();
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
    // Show alert notification
    toast({
      title: '🚨 Emergency!',
      description: `${data.username} needs help!`
    });
  });

  return () => {
    socket.disconnect();
  };
}, []);
```

---

## Test Real-time Tracking

### Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

### Terminal 2 (Frontend):
```bash
npm run dev
```

### Test Flow:
1. Open User Dashboard (`/dashboard`)
2. Open Admin Dashboard (`/admin`) in another tab
3. User moves → Admin sees real-time update instantly!
4. User clicks Emergency → Admin gets instant alert!

---

## Benefits

✅ **100% Free** - No Mapbox, no Supabase costs
✅ **Real-time** - Socket.io instant updates
✅ **Open Source** - Full control
✅ **Self-hosted** - Your data, your server
✅ **Scalable** - MongoDB + Socket.io scale well

---

## Next Steps

I'll now update all the frontend files to use:
1. ✅ Leaflet maps (instead of Mapbox)
2. ✅ Socket.io (instead of Supabase realtime)
3. ✅ MongoDB backend API (instead of Supabase)

Ready to proceed?
