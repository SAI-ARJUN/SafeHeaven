import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  AlertTriangle, 
  Phone, 
  Shield, 
  Wallet,
  Navigation,
  Bell,
  CheckCircle,
  Loader2,
  Link as LinkIcon,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MapboxMap from '@/components/MapboxMap';
import { useDangerZoneDetection } from '@/hooks/useDangerZoneDetection';
import { useContract } from '@/hooks/useContract';
import { api } from '@/lib/api';
import type { Tables } from '@/integrations/supabase/types';

type DangerZone = Tables<'danger_zones'>;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, updateStatus } = useAuth();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  // Blockchain integration
  const { 
    isInitialized: isContractInitialized, 
    isLoading: isContractLoading,
    updateStatus: updateBlockchainStatus,
    updateLocation: updateBlockchainLocation
  } = useContract();

  // Danger zone detection
  useDangerZoneDetection(
    location,
    user?.touristId || '',
    user?.username || ''
  );

  // Load danger zones from API
  const loadDangerZones = useCallback(async () => {
    try {
      const result = await api.dangerZones.getAll();
      if (result.data) {
        setDangerZones(result.data);
      }
    } catch (error) {
      console.error('Error loading danger zones:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadDangerZones();
  }, [loadDangerZones]);

  // Sync location with backend API
  const syncLocationToBackend = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    
    setIsUpdatingLocation(true);
    try {
      await api.locations.update({
        user_id: user.walletAddress, // Using wallet address as user_id for now
        tourist_id: user.touristId,
        lat,
        lng,
        username: user.username,
      });
    } catch (error) {
      console.error('Error syncing location:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [user]);

  useEffect(() => {
    if (isTracking && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(newLocation);
          
          // Save to localStorage for backward compatibility
          localStorage.setItem('userLocation', JSON.stringify(newLocation));
          if (user) {
            localStorage.setItem(`userLocation-${user.touristId}`, JSON.stringify(newLocation));
          }
          
          // Sync to backend API
          await syncLocationToBackend(newLocation.lat, newLocation.lng);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to get your location. Please enable location services.',
            variant: 'destructive',
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isTracking, toast, user, syncLocationToBackend]);

  const handleEmergency = async () => {
    updateStatus('danger');
    
    // Update status to Emergency on blockchain
    if (isContractInitialized) {
      await updateBlockchainStatus('Emergency');
    }
    
    toast({
      title: '🚨 Emergency Alert Sent!',
      description: isContractInitialized 
        ? 'Emergency recorded on blockchain. Help is on the way.'
        : 'Admin has been notified. Help is on the way.',
      variant: 'destructive',
    });
  };

  const handleAlert = async () => {
    updateStatus('alert');
    
    if (isContractInitialized) {
      await updateBlockchainStatus('Alert');
    }
    
    toast({
      title: '⚠️ Alert Sent',
      description: isContractInitialized
        ? 'Alert recorded on blockchain.'
        : 'Admin has been notified of your warning.',
    });
  };

  const handleSafe = async () => {
    updateStatus('safe');
    
    if (isContractInitialized) {
      await updateBlockchainStatus('Safe');
    }
    
    toast({
      title: '✅ Status Updated',
      description: isContractInitialized
        ? 'Safe status recorded on blockchain.'
        : 'Your status has been set to safe.',
    });
  };

  const toggleTracking = () => {
    setIsTracking(!isTracking);
    if (!isTracking) {
      toast({
        title: 'Location Tracking Enabled',
        description: 'Your location is now being monitored and synced to server.',
      });
    } else {
      toast({
        title: 'Location Tracking Disabled',
        description: 'Location monitoring has been stopped.',
      });
    }
  };

  if (!user) return null;

  const getStatusColor = () => {
    switch (user.status) {
      case 'safe': return 'status-safe';
      case 'alert': return 'status-alert';
      case 'danger': return 'status-danger';
      default: return 'status-safe';
    }
  };

  const getStatusText = () => {
    switch (user.status) {
      case 'safe': return 'Safe';
      case 'alert': return 'Alert';
      case 'danger': return 'Emergency';
      default: return 'Safe';
    }
  };

  // Format danger zones for map
  const mapDangerZones = dangerZones.map(zone => ({
    id: zone.id,
    name: zone.name,
    lat: zone.lat,
    lng: zone.lng,
    radius: zone.radius,
    level: (zone.level as 'low' | 'medium' | 'high') || 'medium',
  }));

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            Welcome, <span className="gradient-text">{user.username}</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Database className="w-4 h-4" />
            Your personal safety dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Tourist ID</p>
                <p className="font-mono font-semibold text-primary">{user.touristId}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                  {user.status === 'safe' && <CheckCircle className="w-4 h-4" />}
                  {user.status === 'alert' && <Bell className="w-4 h-4" />}
                  {user.status === 'danger' && <AlertTriangle className="w-4 h-4" />}
                  {getStatusText()}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <p className="font-medium">{user.phone}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Wallet Address
                </p>
                <p className="font-mono text-sm">{user.walletAddress}</p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              <Button
                onClick={handleSafe}
                className="w-full py-4 bg-success hover:bg-success/80 text-success-foreground"
                disabled={user.status === 'safe' || isContractLoading}
              >
                {isContractLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                I'm Safe
              </Button>
              
              <Button
                onClick={handleAlert}
                className="w-full py-4 bg-warning hover:bg-warning/80 text-warning-foreground"
                disabled={user.status === 'alert' || isContractLoading}
              >
                {isContractLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-5 h-5 mr-2" />
                )}
                Send Alert
              </Button>
              
              <Button
                onClick={handleEmergency}
                className="emergency-btn w-full py-6 text-lg rounded-xl"
                disabled={isContractLoading}
              >
                {isContractLoading ? (
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-6 h-6 mr-2" />
                )}
                EMERGENCY
              </Button>
              
              {isContractInitialized && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                  <LinkIcon className="w-3 h-3 text-success" />
                  <span>Connected to blockchain</span>
                </div>
              )}
            </div>
          </div>

          {/* Location Card with Map */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Live Location
                {isUpdatingLocation && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </h2>
              <Button
                onClick={toggleTracking}
                variant={isTracking ? 'default' : 'outline'}
                className={isTracking ? 'bg-success hover:bg-success/80' : ''}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {isTracking ? 'Tracking On' : 'Enable Tracking'}
              </Button>
            </div>

            <div className="h-[400px] rounded-xl overflow-hidden">
              <MapboxMap
                dangerZones={mapDangerZones}
                currentUserLocation={location}
                showDangerZones={true}
                showUserMarkers={false}
              />
            </div>

            {location && (
              <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Current Coordinates</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {isTracking && (
                    <span className="flex items-center gap-2 text-xs text-success">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      Live
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="w-3 h-3" />
                    Synced to server
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Info */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Emergency Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-sm font-medium text-destructive mb-1">Emergency Button</p>
                <p className="text-xs text-muted-foreground">
                  Press in life-threatening situations. Sends immediate alert with your location to all admins.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                <p className="text-sm font-medium text-warning mb-1">Alert Button</p>
                <p className="text-xs text-muted-foreground">
                  Use when you feel uncomfortable or enter a risky area. Notifies admins to monitor you.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                <p className="text-sm font-medium text-success mb-1">Safe Status</p>
                <p className="text-xs text-muted-foreground">
                  Reset your status when you're safe. Helps admins know you're okay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
