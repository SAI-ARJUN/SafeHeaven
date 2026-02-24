import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MapPin,
  AlertTriangle,
  Shield,
  Bell,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  LogOut,
  Wallet,
  Loader2,
  Link as LinkIcon,
  RefreshCw,
  Database,
  Send,
  MessageSquare,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import MapboxMap from '@/components/MapboxMap';
import { useContract } from '@/hooks/useContract';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { useRealtimeLocations } from '@/hooks/useRealtimeLocations';
import { useRealtimeProfiles } from '@/hooks/useRealtimeProfiles';
import { api } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Alert = Tables<'alerts'>;
type DangerZone = Tables<'danger_zones'>;
type UserLocation = Tables<'user_locations'>;

interface BlockchainAlert {
  id: string;
  tourist: string;
  touristId: string;
  lat: number;
  lng: number;
  timestamp: Date;
  type: 'emergency' | 'status';
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminLogout } = useAuth();
  const { disconnectWallet, walletAddress } = useWallet();

  // API Data State
  const [users, setUsers] = useState<Profile[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [analytics, setAnalytics] = useState<{ total_users: number; safe_users: number; alert_users: number; danger_users: number; active_alerts: number } | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [newZone, setNewZone] = useState({ name: '', lat: '', lng: '', radius: '', level: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical' });
  const [showAddZone, setShowAddZone] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [blockchainAlerts, setBlockchainAlerts] = useState<BlockchainAlert[]>([]);

  // Notification state
  const [notifyTarget, setNotifyTarget] = useState<Profile | null>(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyType, setNotifyType] = useState<'info' | 'warning' | 'danger' | 'evacuation'>('warning');
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Blockchain integration
  const {
    isInitialized: isContractInitialized,
    isLoading: isContractLoading,
    createDangerZone: addBlockchainDangerZone,
    removeDangerZone: removeBlockchainDangerZone,
    getAllDangerZones: getBlockchainDangerZones,
    onEmergencyAlert,
    onStatusUpdate,
    onDangerZoneAdded,
  } = useContract();

  // Load data directly from Supabase (Edge Function not needed)
  const loadData = useCallback(async () => {
    try {
      const [usersRes, alertsRes, zonesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }), // ALL alerts, for tourist derivation
        supabase.from('danger_zones').select('*').order('created_at', { ascending: false }),
      ]);

      const loadedUsers = usersRes.data || [];
      const loadedAlerts = alertsRes.data || [];

      if (usersRes.error) console.error('profiles error:', usersRes.error);
      if (alertsRes.error) console.error('alerts error:', alertsRes.error);
      if (zonesRes.error) console.error('danger_zones error:', zonesRes.error);

      setUsers(loadedUsers);
      setAlerts(loadedAlerts);
      setDangerZones(zonesRes.data || []);

      // Analytics computed after displayUsers is derived below
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime alerts subscription
  useRealtimeAlerts({
    onNewAlert: (newAlert) => {
      setAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
      // Update analytics
      setAnalytics(prev => prev ? { ...prev, active_alerts: prev.active_alerts + 1 } : null);
    },
    onAlertDismissed: (dismissedAlert) => {
      setAlerts(prev => prev.filter(a => a.id !== dismissedAlert.id));
      setAnalytics(prev => prev ? { ...prev, active_alerts: Math.max(0, prev.active_alerts - 1) } : null);
    },
    enabled: true,
  });

  // Realtime locations subscription — using split callbacks
  useRealtimeLocations({
    onLocationsLoaded: (locations) => {
      setUserLocations(locations);
    },
    onLocationUpdate: (location) => {
      setUserLocations(prev => {
        const existing = prev.findIndex(l => l.user_id === location.user_id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = location;
          return updated;
        }
        return [...prev, location];
      });
    },
    enabled: true,
  });

  // Realtime profiles subscription for new user registrations
  useRealtimeProfiles({
    onNewProfile: (profile) => {
      setUsers(prev => [profile, ...prev.filter(u => u.id !== profile.id)]);
      // Update analytics
      setAnalytics(prev => prev ? {
        ...prev,
        total_users: prev.total_users + 1,
        safe_users: profile.status === 'safe' ? prev.safe_users + 1 : prev.safe_users,
      } : null);
      toast({
        title: '👤 New Tourist Registered!',
        description: `${profile.username} (${profile.tourist_id}) has registered.`,
      });
    },
    onProfileUpdated: (profile) => {
      setUsers(prev => prev.map(u => u.id === profile.id ? profile : u));
    },
    enabled: true,
  });

  // Setup blockchain event listeners
  useEffect(() => {
    if (!isContractInitialized) return;

    onEmergencyAlert((event) => {
      const newAlert: BlockchainAlert = {
        id: `bc-emergency-${Date.now()}`,
        tourist: event.tourist,
        touristId: event.touristId,
        lat: 0, // Location not available in this event
        lng: 0,
        timestamp: event.timestamp,
        type: 'emergency',
      };

      setBlockchainAlerts(prev => [newAlert, ...prev].slice(0, 20));

      toast({
        title: '🚨 Blockchain Emergency Alert!',
        description: `Emergency from ${event.touristId.slice(0, 8)}...`,
        variant: 'destructive',
      });
    });

    onStatusUpdate((event) => {
      const statusNames = ['Safe', 'Alert', 'Danger'];
      const statusName = statusNames[event.newStatus] || 'Unknown';

      if (event.newStatus >= 1) {
        toast({
          title: `⚡ Blockchain Status Update`,
          description: `Tourist ${event.tourist.slice(0, 8)}... changed to ${statusName}`,
          variant: event.newStatus === 2 ? 'destructive' : 'default',
        });
      }
    });

    onDangerZoneAdded((event) => {
      toast({
        title: '🗺️ New Danger Zone',
        description: `Zone "${event.name}" added via blockchain`,
      });
      loadData();
    });
  }, [isContractInitialized, onEmergencyAlert, onStatusUpdate, onDangerZoneAdded, toast, loadData]);

  // Check admin auth and load data
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin !== 'true') {
      navigate('/admin-login');
      return;
    }
    loadData();
  }, [navigate, loadData]);

  const handleLogout = () => {
    adminLogout();
    disconnectWallet();
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully.',
    });
    navigate('/admin-login');
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.from('alerts').update({ dismissed: true }).eq('id', alertId);
      if (error) throw error;
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast({
        title: 'Alert Dismissed',
        description: 'The alert has been dismissed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert.',
        variant: 'destructive',
      });
    }
  };

  const addDangerZone = async () => {
    if (!newZone.name || !newZone.lat || !newZone.lng || !newZone.radius) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add to blockchain if connected
      if (isContractInitialized) {
        const success = await addBlockchainDangerZone(
          newZone.name,
          parseFloat(newZone.lat),
          parseFloat(newZone.lng),
          parseFloat(newZone.radius),
          newZone.level
        );
        if (!success) return;
      }

      // Add to database directly
      const { data: zoneData, error: zoneError } = await supabase.from('danger_zones').insert({
        name: newZone.name,
        lat: parseFloat(newZone.lat),
        lng: parseFloat(newZone.lng),
        radius: parseFloat(newZone.radius),
        level: newZone.level,
      }).select().single();

      if (zoneError) throw zoneError;
      if (zoneData) {
        setDangerZones(prev => [zoneData, ...prev]);
      }

      setNewZone({ name: '', lat: '', lng: '', radius: '', level: 'Medium' });
      setShowAddZone(false);

      toast({
        title: 'Danger Zone Added',
        description: isContractInitialized
          ? `${newZone.name} has been added to the blockchain and database.`
          : `${newZone.name} has been added to the database.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add danger zone.',
        variant: 'destructive',
      });
    }
  };

  const removeDangerZone = async (id: string, blockchainId?: number) => {
    try {
      // Remove from blockchain if connected
      if (isContractInitialized && blockchainId !== undefined) {
        const success = await removeBlockchainDangerZone(blockchainId);
        if (!success) return;
      }

      const { error: delError } = await supabase.from('danger_zones').delete().eq('id', id);
      if (delError) throw delError;
      setDangerZones(prev => prev.filter(z => z.id !== id));

      toast({
        title: 'Zone Removed',
        description: isContractInitialized
          ? 'Danger zone has been removed from blockchain and database.'
          : 'Danger zone has been removed from database.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove danger zone.',
        variant: 'destructive',
      });
    }
  };

  const syncFromBlockchain = async () => {
    if (!isContractInitialized) {
      toast({
        title: 'Not Connected',
        description: 'Connect to blockchain first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const blockchainZones = await getBlockchainDangerZones();

      toast({
        title: 'Synced',
        description: `Found ${blockchainZones.length} danger zones on blockchain.`,
      });

      loadData();
    } catch (err) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync danger zones from blockchain.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'low': case 'Low': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'medium': case 'Medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'high': case 'High': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'Critical': return 'bg-red-600/30 text-red-300 border-red-600/50';
      default: return 'bg-muted';
    }
  };

  // Send notification to a tourist
  const sendNotification = async () => {
    if (!notifyTarget || !notifyMessage.trim()) return;

    setIsSendingNotification(true);
    try {
      await api.notifications.send({
        tourist_id: notifyTarget.tourist_id,
        user_id: notifyTarget.user_id,
        admin_wallet: walletAddress || 'admin',
        message: notifyMessage.trim(),
        notification_type: notifyType,
      });

      toast({
        title: 'Notification Sent',
        description: `Alert sent to ${notifyTarget.username}.`,
      });

      setNotifyTarget(null);
      setNotifyMessage('');
      setNotifyType('warning');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send notification.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Format locations for map — MERGE user_locations (live GPS) + alerts (fallback)
  // This ensures ALL tourists appear, regardless of which data source succeeds
  const mapLocations = (() => {
    // Step 1: start with live GPS locations
    const merged: Record<string, { touristId: string; username: string; lat: number; lng: number; status: 'safe' | 'alert' | 'danger' }> = {};

    for (const loc of userLocations) {
      const profile = displayUsers.find(u => u.tourist_id === loc.tourist_id);
      merged[loc.tourist_id] = {
        touristId: loc.tourist_id,
        username: profile?.username || loc.tourist_id,
        lat: loc.lat,
        lng: loc.lng,
        status: (loc.status || 'safe') as 'safe' | 'alert' | 'danger',
      };
    }

    // Step 2: fill in tourists missing from user_locations using latest alert lat/lng
    const latestAlertPerTourist: Record<string, Alert> = {};
    for (const a of alerts) {
      if (a.lat == null || a.lng == null) continue;
      const prev = latestAlertPerTourist[a.tourist_id];
      if (!prev || new Date(a.created_at ?? 0) > new Date(prev.created_at ?? 0)) {
        latestAlertPerTourist[a.tourist_id] = a;
      }
    }
    for (const a of Object.values(latestAlertPerTourist)) {
      if (merged[a.tourist_id]) {
        // Already have live GPS — just update status from latest alert
        merged[a.tourist_id].status = (a.status || 'safe') as 'safe' | 'alert' | 'danger';
      } else {
        // No live GPS — use alert position
        merged[a.tourist_id] = {
          touristId: a.tourist_id,
          username: a.username ?? a.tourist_id,
          lat: a.lat!,
          lng: a.lng!,
          status: (a.status || 'safe') as 'safe' | 'alert' | 'danger',
        };
      }
    }

    return Object.values(merged);
  })();


  // Registered tourists: from profiles table, or derived from alerts as fallback
  // Use LATEST alert status per tourist
  const displayUsers = users.length > 0 ? users : Object.values(
    alerts.reduce((acc, a) => {
      const existing = acc[a.tourist_id];
      const isNewer = !existing ||
        new Date(a.created_at ?? 0) > new Date(existing.created_at ?? 0);
      if (isNewer) {
        acc[a.tourist_id] = {
          id: a.tourist_id,
          user_id: a.user_id,
          tourist_id: a.tourist_id,
          username: a.username ?? 'Unknown',
          email: null,
          phone: null,
          dob: null,
          wallet_address: null,
          status: a.status ?? 'safe',
          created_at: a.created_at,
        } as Profile;
      }
      return acc;
    }, {} as Record<string, Profile>)
  );

  // Stats derived from displayUsers
  const statsTotal = displayUsers.length;
  const statsSafe = displayUsers.filter(u => u.status === 'safe').length;
  const statsAlert = displayUsers.filter(u => u.status === 'alert').length;
  const statsDanger = displayUsers.filter(u => u.status === 'danger').length;
  const activeAlerts = alerts.filter(a => !a.dismissed).length;

  // Format danger zones for map
  const mapDangerZones = dangerZones.map(zone => ({
    id: zone.id,
    name: zone.name,
    lat: zone.lat,
    lng: zone.lng,
    radius: zone.radius,
    level: (zone.level as 'low' | 'medium' | 'high') || 'medium',
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" />
              Connected to database • Real-time updates enabled
            </p>
          </div>
          <div className="flex items-center gap-4">
            {walletAddress && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 border border-border">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsTotal}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsSafe}</p>
                <p className="text-sm text-muted-foreground">Safe</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsAlert}</p>
                <p className="text-sm text-muted-foreground">Alert</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsDanger}</p>
                <p className="text-sm text-muted-foreground">Emergency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Map */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Live User Tracking Map
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-success/20 text-success flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </h2>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapboxMap
              dangerZones={mapDangerZones}
              userLocations={mapLocations}
              showDangerZones={true}
              showUserMarkers={true}
              isAdmin={true}
            />
          </div>
        </div>

        {/* Blockchain Emergency Alerts */}
        {blockchainAlerts.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-2 border-primary/50">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2 text-primary">
              <LinkIcon className="w-5 h-5" />
              Blockchain Alerts
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20">
                Live
              </span>
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {blockchainAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${alert.type === 'emergency'
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-warning/10 border-warning/30'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {alert.type === 'emergency' ? (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        ) : (
                          <Bell className="w-4 h-4 text-warning" />
                        )}
                        <span className="font-medium">
                          {alert.type === 'emergency' ? 'Emergency' : 'Status Update'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                          On-Chain
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {alert.touristId || alert.tourist.slice(0, 16)}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Alerts - Real-time */}
        {alerts.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-2 border-destructive/50">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              Active Alerts
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive">
                {alerts.length} active
              </span>
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${alert.alert_type === 'entered_danger_zone'
                    ? 'bg-destructive/10 border-destructive/30'
                    : alert.status === 'danger'
                      ? 'bg-destructive/10 border-destructive/30'
                      : 'bg-warning/10 border-warning/30'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${alert.status === 'danger' ? 'text-destructive' : 'text-warning'}`} />
                        <span className="font-medium">{alert.username}</span>
                        {alert.zone_name && (
                          <>
                            <span className="text-xs text-muted-foreground">entered</span>
                            <span className="font-medium text-destructive">{alert.zone_name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{alert.tourist_id}</p>
                      {alert.lat && alert.lng && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {alert.created_at && new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registered Users Table */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Registered Tourists
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {users.length} total
              </span>
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {displayUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No registered tourists yet</p>
              ) : (
                displayUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.tourist_id}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              📧 {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1">
                                📱 {user.phone}
                              </span>
                            )}
                          </div>
                          {user.wallet_address && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              <Wallet className="w-3 h-3 inline mr-1" />
                              {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Registered: {user.created_at && new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => setNotifyTarget(user)}
                          >
                            <Send className="w-3 h-3" />
                            Alert
                          </Button>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${user.status === 'safe' ? 'status-safe' :
                            user.status === 'alert' ? 'status-alert' : 'status-danger'
                            }`}>
                            {user.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Alerts History */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alert Activity
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No alerts yet</p>
              ) : (
                alerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border ${alert.status === 'danger' ? 'bg-destructive/10 border-destructive/30' : 'bg-warning/10 border-warning/30'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {alert.status === 'danger' ? (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Bell className="w-4 h-4 text-warning" />
                          )}
                          <span className="font-medium">{alert.username}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.tourist_id}</p>
                        {alert.alert_type === 'entered_danger_zone' && (
                          <p className="text-xs text-destructive mt-1">
                            Entered: {alert.zone_name} ({alert.zone_level})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {alert.created_at && new Date(alert.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zones */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Danger Zones
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                    {dangerZones.length}
                  </span>
                </h2>
                {isContractInitialized && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <LinkIcon className="w-3 h-3 text-success" />
                    <span>Blockchain connected</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isContractInitialized && (
                  <Button
                    onClick={syncFromBlockchain}
                    variant="outline"
                    size="sm"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync from Chain
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddZone(!showAddZone)}
                  className="btn-gradient"
                  disabled={isContractLoading}
                >
                  {isContractLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Zone
                </Button>
              </div>
            </div>

            {/* Add Zone Form */}
            {showAddZone && (
              <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border">
                <h3 className="font-medium mb-4">Add New Danger Zone</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Input
                    placeholder="Zone Name"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Latitude"
                    type="number"
                    step="0.000001"
                    value={newZone.lat}
                    onChange={(e) => setNewZone({ ...newZone, lat: e.target.value })}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Longitude"
                    type="number"
                    step="0.000001"
                    value={newZone.lng}
                    onChange={(e) => setNewZone({ ...newZone, lng: e.target.value })}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Radius (m)"
                    type="number"
                    value={newZone.radius}
                    onChange={(e) => setNewZone({ ...newZone, radius: e.target.value })}
                    className="bg-muted/50"
                  />
                  <select
                    value={newZone.level}
                    onChange={(e) => setNewZone({ ...newZone, level: e.target.value as 'Low' | 'Medium' | 'High' | 'Critical' })}
                    className="px-3 py-2 rounded-lg bg-muted/50 border border-border"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                    <option value="Critical">Critical Risk</option>
                  </select>
                </div>
                <Button
                  onClick={addDangerZone}
                  className="btn-gradient mt-4"
                  disabled={isContractLoading}
                >
                  {isContractLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save Zone
                </Button>
              </div>
            )}

            {/* Zones List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dangerZones.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No danger zones added yet
                </p>
              ) : (
                dangerZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-4 rounded-xl border ${getLevelColor(zone.level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{zone.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Radius: {zone.radius}m
                        </p>
                      </div>
                      <button
                        onClick={() => removeDangerZone(zone.id)}
                        className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium uppercase px-2 py-1 rounded ${getLevelColor(zone.level)}`}>
                        {zone.level} Risk
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Notification Modal */}
      {
        notifyTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-border shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Send Alert</h3>
                </div>
                <button
                  onClick={() => setNotifyTarget(null)}
                  className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm font-medium">{notifyTarget.username}</p>
                <p className="text-xs text-muted-foreground font-mono">{notifyTarget.tourist_id}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Alert Type</label>
                  <select
                    value={notifyType}
                    onChange={(e) => setNotifyType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                  >
                    <option value="info">ℹ️ Information</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="danger">🚨 Danger Alert</option>
                    <option value="evacuation">🏃 Evacuation Order</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Message</label>
                  <textarea
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Type your alert message..."
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm h-24 resize-none"
                  />
                </div>

                <Button
                  onClick={sendNotification}
                  disabled={!notifyMessage.trim() || isSendingNotification}
                  className="w-full btn-gradient gap-2"
                >
                  {isSendingNotification ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Notification
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default AdminDashboard;
