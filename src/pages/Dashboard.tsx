import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  AlertTriangle,
  Shield,
  Navigation,
  Bell,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Radio,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MapboxMap from '@/components/MapboxMap';
import { useDangerZoneDetection } from '@/hooks/useDangerZoneDetection';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { api } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useSendLocation } from '@/hooks/useSendLocation';

type DangerZone = Tables<'danger_zones'>;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, updateStatus } = useAuth();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Local status state for realtime sync
  const [status, setStatus] = useState<'safe' | 'alert' | 'danger'>('safe');

  useEffect(() => {
    if (user?.status) {
      setStatus(user.status as any);
    }
  }, [user?.status]);

  // Activate realtime location sender (direct Supabase upsert, no Edge function)
  useSendLocation(user?.id || '', user?.touristId || '', status);

  const { nearestZone } = useDangerZoneDetection(
    location,
    user?.touristId || '',
    user?.username || '',
    user?.id
  );

  // Admin notifications subscription
  const { notifications, unreadCount, markAsRead, markAllRead } = useRealtimeNotifications({
    touristId: user?.touristId || '',
    enabled: !!user?.touristId,
  });

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
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadDangerZones();
  }, [loadDangerZones]);

  // ─── Sync this tourist's profile to Supabase so admin can see them ───
  useEffect(() => {
    if (!user) return;
    const syncProfile = async () => {
      // Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('tourist_id', user.touristId)
        .maybeSingle();

      if (existing) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({ username: user.username, email: user.email || '', status: user.status || 'safe' })
          .eq('tourist_id', user.touristId);
        if (error) console.warn('Profile update error:', error.message);
      } else {
        // Insert new profile
        const uid = user.id || crypto.randomUUID();
        const { error } = await supabase.from('profiles').insert({
          id: uid,
          user_id: uid,
          tourist_id: user.touristId,
          username: user.username,
          email: user.email || '',
          status: user.status || 'safe',
        });
        if (error) console.warn('Profile insert error:', error.message);
      }
    };
    syncProfile();
  }, [user?.touristId]);


  // ─── GPS watch for local state only (useSendLocation handles DB writes) ───
  useEffect(() => {
    if (!isTracking || !navigator.geolocation || !user) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      console.warn,
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('GPS watch error:', error);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking, user]);

  useEffect(() => {
    if (user && isTracking) {
      toast({
        title: '📍 Location Tracking Active',
        description: 'Live location sharing enabled.',
      });
    }
  }, [user]);

  // ─── Insert alert directly to Supabase (no blockchain) ───
  const insertAlert = async (alertStatus: 'alert' | 'danger', alertType: string) => {
    const userId = user?.id || user?.walletAddress || crypto.randomUUID();
    const touristId = user?.touristId || '';
    const username = user?.username || 'Unknown';

    if (!touristId) {
      console.error('Cannot insert alert: no touristId');
      return;
    }

    const { error } = await supabase.from('alerts').insert({
      alert_id: crypto.randomUUID(),
      user_id: userId,
      tourist_id: touristId,
      username: username,
      status: alertStatus,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      alert_type: alertType,
      dismissed: false,
    });
    if (error) {
      console.error('Alert insert error:', JSON.stringify(error));
      toast({
        title: `DB Error [${error.code}]`,
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // ─── Status handlers ───
  const handleEmergency = async () => {
    updateStatus('danger');
    setStatus('danger');
    await insertAlert('danger', 'emergency');
    toast({
      title: '🚨 Emergency Alert Sent!',
      description: 'Your emergency has been reported to authorities.',
      variant: 'destructive',
    });
  };

  const handleAlert = async () => {
    updateStatus('alert');
    setStatus('alert');
    await insertAlert('alert', 'status_change');
    toast({ title: '⚠️ Alert Sent', description: 'Your alert has been sent to authorities.' });
  };

  const handleSafe = async () => {
    updateStatus('safe');
    setStatus('safe');
    toast({ title: '✅ Status Updated', description: 'You are marked as safe.' });
  };

  const toggleTracking = () => {
    setIsTracking(!isTracking);
    toast({
      title: isTracking ? '📍 Tracking Paused' : '📍 Tracking Resumed',
      description: isTracking ? 'Location sharing disabled.' : 'Location sharing enabled.',
    });
  };

  if (!user) return null;

  // Safety score calculation
  const safetyScore = (() => {
    let score = 100;
    if (status === 'alert') score -= 30;
    if (status === 'danger') score -= 60;
    if (nearestZone) {
      const ratio = nearestZone.distance / nearestZone.zone.radius;
      if (ratio <= 1) score -= 25;
      else if (ratio <= 1.5) score -= 10;
    }
    if (!isTracking) score -= 5;
    return Math.max(0, Math.min(100, score));
  })();

  const safetyColor = safetyScore >= 70 ? 'text-green-400' : safetyScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const safetyBg = safetyScore >= 70 ? 'bg-green-500/10 border-green-500/30' : safetyScore >= 40 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30';

  const statusConfig = {
    safe: { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/50', label: 'SAFE', glow: 'shadow-green-500/20' },
    alert: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/50', label: 'ALERT', glow: 'shadow-amber-500/20' },
    danger: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/50', label: 'DANGER', glow: 'shadow-red-500/20' },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const mapDangerZones = dangerZones.map(zone => ({
    id: zone.id,
    name: zone.name,
    lat: zone.lat,
    lng: zone.lng,
    radius: zone.radius,
    level: (zone.level as any) || 'medium',
  }));

  const typeIcons: Record<string, string> = {
    danger: '🚨',
    evacuation: '🏃',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Header with notification bell */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome, <span className="gradient-text">{user.username}</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              {user.touristId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Safety Score */}
          <div className={`glass-card rounded-2xl p-5 border ${safetyBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Safety Score</p>
                <p className={`text-4xl font-bold ${safetyColor}`}>{safetyScore}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {safetyScore >= 70 ? 'You are in a safe area' : safetyScore >= 40 ? 'Exercise caution' : 'High risk — stay alert'}
                </p>
              </div>
              <Activity className={`w-8 h-8 ${safetyColor} opacity-60`} />
            </div>
          </div>

          {/* Current Status */}
          <div className={`glass-card rounded-2xl p-5 border ${currentStatus.bg} ${currentStatus.glow} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Status</p>
                <p className={`text-2xl font-bold ${currentStatus.color}`}>{currentStatus.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {status === 'safe' ? 'All clear' : status === 'alert' ? 'Help requested' : 'Emergency active'}
                </p>
              </div>
              <StatusIcon className={`w-8 h-8 ${currentStatus.color} opacity-60`} />
            </div>
          </div>

          {/* GPS Tracking */}
          <div className="glass-card rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">GPS Tracking</p>
                <p className={`text-lg font-bold ${isTracking ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {isTracking ? 'Active' : 'Paused'}
                </p>
                {location && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                )}
              </div>
              <button
                onClick={toggleTracking}
                className={`p-3 rounded-xl transition-all ${isTracking
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
              >
                {isTracking ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            {isTracking && (
              <div className="flex items-center gap-1.5 mt-2">
                <Radio className="w-3 h-3 text-green-400 animate-pulse" />
                <span className="text-xs text-green-400">Broadcasting location</span>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Buttons */}
        <div className="glass-card rounded-2xl p-5 mb-6 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleSafe}
              className={`p-4 rounded-xl border-2 transition-all font-semibold text-sm flex flex-col items-center gap-2 ${status === 'safe'
                ? 'bg-green-500/20 border-green-500 text-green-400 shadow-lg shadow-green-500/10'
                : 'border-green-500/30 text-green-400/70 hover:bg-green-500/10 hover:border-green-500/60'
                }`}
            >
              <ShieldCheck className="w-6 h-6" />
              I'm Safe
            </button>
            <button
              onClick={handleAlert}
              className={`p-4 rounded-xl border-2 transition-all font-semibold text-sm flex flex-col items-center gap-2 ${status === 'alert'
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
                : 'border-amber-500/30 text-amber-400/70 hover:bg-amber-500/10 hover:border-amber-500/60'
                }`}
            >
              <ShieldAlert className="w-6 h-6" />
              Alert
            </button>
            <button
              onClick={handleEmergency}
              className={`p-4 rounded-xl border-2 transition-all font-semibold text-sm flex flex-col items-center gap-2 ${status === 'danger'
                ? 'bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-500/10 animate-pulse'
                : 'border-red-500/30 text-red-400/70 hover:bg-red-500/10 hover:border-red-500/60'
                }`}
            >
              <ShieldX className="w-6 h-6" />
              Emergency
            </button>
          </div>
        </div>

        {/* Zone Awareness */}
        {nearestZone && nearestZone.distance <= nearestZone.zone.radius * 2 && (
          <div className={`glass-card rounded-2xl p-5 mb-6 border-2 ${nearestZone.distance <= nearestZone.zone.radius
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-amber-500/50 bg-amber-500/5'
            }`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-6 h-6 ${nearestZone.distance <= nearestZone.zone.radius ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
              <div>
                <p className="font-semibold text-sm">
                  {nearestZone.distance <= nearestZone.zone.radius
                    ? `⚠️ Inside Danger Zone: ${nearestZone.zone.name}`
                    : `📍 Near Danger Zone: ${nearestZone.zone.name}`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.round(nearestZone.distance)}m away • {(nearestZone.zone.level || 'medium').toUpperCase()} risk
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="glass-card rounded-2xl p-5 mb-6 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Area Map</h2>
            {isTracking && (
              <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapboxMap
              dangerZones={mapDangerZones}
              currentUserLocation={location}
              showDangerZones={true}
              showUserMarkers={false}
            />
          </div>
        </div>

        {/* Admin Notifications Panel (slide-in) */}
        {showNotifications && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowNotifications(false)}>
            <div
              className="w-full max-w-sm bg-background border-l border-border h-full overflow-y-auto p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-1.5 hover:bg-muted/50 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline mb-3 block"
                >
                  Mark all as read
                </button>
              )}

              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-12 text-sm">No notifications yet</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer ${notif.read
                        ? 'bg-muted/20 border-border/50 opacity-70'
                        : 'bg-muted/40 border-border hover:bg-muted/60'
                        }`}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">
                          {typeIcons[notif.notification_type || 'warning'] || '⚠️'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {notif.notification_type === 'danger' ? 'Danger Alert'
                              : notif.notification_type === 'evacuation' ? 'Evacuation Order'
                                : notif.notification_type === 'info' ? 'Information'
                                  : 'Warning'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notif.created_at && new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
