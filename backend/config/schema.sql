-- SafeHeaven Database Schema

CREATE DATABASE IF NOT EXISTS safeheaven;
USE safeheaven;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tourist_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  dob VARCHAR(50),
  wallet_address VARCHAR(255) UNIQUE,
  status ENUM('safe', 'alert', 'danger') DEFAULT 'safe',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tourist_id (tourist_id),
  INDEX idx_wallet_address (wallet_address),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(255) PRIMARY KEY,
  alert_id VARCHAR(255),
  user_id VARCHAR(255),
  tourist_id VARCHAR(50) NOT NULL,
  username VARCHAR(255),
  status ENUM('safe', 'alert', 'danger') DEFAULT 'alert',
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  alert_type VARCHAR(100),
  zone_name VARCHAR(255),
  zone_level VARCHAR(50),
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tourist_id (tourist_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User locations table
CREATE TABLE IF NOT EXISTS user_locations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  tourist_id VARCHAR(50) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  status ENUM('safe', 'alert', 'danger') DEFAULT 'safe',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tourist_id (tourist_id),
  INDEX idx_tourist_id (tourist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Danger zones table
CREATE TABLE IF NOT EXISTS danger_zones (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  radius DECIMAL(10, 2) NOT NULL,
  level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lat_lng (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  tourist_id VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('info', 'warning', 'danger', 'evacuation') DEFAULT 'warning',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tourist_id (tourist_id),
  INDEX idx_read (read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample danger zone (Saravanampatti)
INSERT INTO danger_zones (id, name, lat, lng, radius, level) 
VALUES ('zone_001', 'Saravanampatti', 11.08344, 76.99720, 1000, 'high')
ON DUPLICATE KEY UPDATE name=name;
