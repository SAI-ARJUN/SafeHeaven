import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/mongodb.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import alertRoutes from './routes/alerts.js';
import locationRoutes from './routes/locations.js';
import zoneRoutes from './routes/zones.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/zones', zoneRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // User joined - join their room
  socket.on('user_join', (touristId) => {
    socket.join(`user:${touristId}`);
    socket.join('admin:room');
    console.log(`User ${touristId} joined rooms`);
  });

  // Admin joined
  socket.on('admin_join', () => {
    socket.join('admin:room');
    console.log('Admin joined monitoring room');
  });

  // Location update from user
  socket.on('location_update', async (data) => {
    const { touristId, latitude, longitude, status } = data;
    
    // Broadcast to all admins in real-time
    io.to('admin:room').emit('admin_location_update', {
      touristId,
      latitude,
      longitude,
      status,
      timestamp: new Date().toISOString()
    });

    console.log(`📍 Location update: ${touristId} at ${latitude}, ${longitude}`);
  });

  // Emergency alert
  socket.on('emergency_alert', (data) => {
    const { touristId, username, latitude, longitude, alertType } = data;
    
    // Broadcast emergency to all admins
    io.to('admin:room').emit('admin_emergency_alert', {
      touristId,
      username,
      latitude,
      longitude,
      alertType,
      timestamp: new Date().toISOString()
    });

    console.log(`🚨 Emergency alert: ${touristId} - ${alertType}`);
  });

  // Danger zone created (from admin)
  socket.on('danger_zone_created', (data) => {
    io.emit('new_danger_zone', data);
    console.log(`🛡️ Danger zone created: ${data.name}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
httpServer.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════╗
║       SafeHeaven Backend Server                ║
╠════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}              ║
║  🔗 API: http://localhost:${PORT}/api           ║
║  🔌 Socket.io: http://localhost:${PORT}         ║
║  📊 Environment: ${process.env.NODE_ENV || 'development'}                       ║
╚════════════════════════════════════════════════╝
  `);
  
  // Connect to MongoDB
  await connectDB();
});
