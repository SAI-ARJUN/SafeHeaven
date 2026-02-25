# SafeHeaven Backend - Node.js + MySQL

## Prerequisites

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/

2. **MySQL Server**
   - Install MySQL Community Server: https://dev.mysql.com/downloads/mysql/
   - OR use XAMPP/WAMP (includes MySQL)

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Edit `backend/.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=safeheaven
```

### 3. Setup MySQL Database

**Option A: Automatic (Recommended)**
The database will be created automatically when you start the server.

**Option B: Manual**
```bash
# Login to MySQL
mysql -u root -p

# Run schema
source config/schema.sql
```

### 4. Start the Server

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

Server will start on: **http://localhost:3001**

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Tourist ID
- `POST /api/auth/login/wallet` - Login with wallet address
- `POST /api/auth/register` - Register new user

### Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:tourist_id` - Get profile by ID
- `PUT /api/profiles/:tourist_id` - Update profile

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id/dismiss` - Dismiss alert

### Locations
- `GET /api/locations` - Get all locations
- `POST /api/locations` - Update/Create location

### Danger Zones
- `GET /api/zones` - Get all danger zones
- `POST /api/zones` - Create danger zone
- `DELETE /api/zones/:id` - Delete danger zone

### Notifications
- `GET /api/notifications/tourist/:tourist_id` - Get notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read

## Test the API

### Health Check
```bash
curl http://localhost:3001/health
```

### Get All Profiles
```bash
curl http://localhost:3001/api/profiles
```

### Create Alert
```bash
curl -X POST http://localhost:3001/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "alert_001",
    "tourist_id": "TID-001",
    "username": "John",
    "status": "alert",
    "lat": 11.08344,
    "lng": 76.99720
  }'
```

## Connect Frontend

Update your frontend `.env` file:

```env
VITE_BACKEND_URL=http://localhost:3001
```

The frontend will now use the Node.js backend instead of Supabase.

## Troubleshooting

### MySQL Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Make sure MySQL is running
```bash
# Windows - Check Services
services.msc → MySQL service → Start

# Mac/Linux
sudo systemctl start mysql
```

### Access Denied
```
Error: ER_ACCESS_DENIED_ERROR
```
**Solution:** Check username/password in `.env`

### Port Already in Use
```
Error: listen EADDRINUSE:3001
```
**Solution:** Change PORT in `.env` or kill the process using port 3001

## Database Schema

The backend creates these tables automatically:
- `profiles` - User profiles
- `alerts` - Emergency alerts
- `user_locations` - Live user locations
- `danger_zones` - Danger zone areas
- `notifications` - Admin notifications

## Development

```bash
# With auto-restart
npm run dev

# View logs
tail -f logs/app.log
```

## Production

```bash
# Set environment
NODE_ENV=production npm start

# Use PM2 for production
npm install -g pm2
pm2 start server.js --name safeheaven-api
```
