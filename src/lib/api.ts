import { supabase } from "@/integrations/supabase/client";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

async function fetchAPI(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// Health check
export const checkHealth = () => fetchAPI("/health");

// Registration
export const registerUser = (profile: {
  username: string;
  email: string;
  phone: string;
  dob: string;
  wallet_address: string;
  tourist_id?: string;
  user_id?: string;
}) =>
  fetchAPI("/register", {
    method: "POST",
    body: JSON.stringify(profile),
  });

// Users
export const getAllUsers = () => fetchAPI("/users");
export const getUserById = (userId: string) => fetchAPI(`/users/${userId}`);
export const updateUserStatus = (userId: string, status: string) =>
  fetchAPI(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// Danger Zones
export const getDangerZones = () => fetchAPI("/danger-zones");
export const createDangerZone = (zone: {
  name: string;
  lat: number;
  lng: number;
  radius: number;
  level: string;
  created_by?: string;
}) =>
  fetchAPI("/danger-zones", {
    method: "POST",
    body: JSON.stringify(zone),
  });
export const deleteDangerZone = (zoneId: string) =>
  fetchAPI(`/danger-zones/${zoneId}`, { method: "DELETE" });

// Alerts
export const getActiveAlerts = () => fetchAPI("/alerts");
export const dismissAlert = (alertId: string) =>
  fetchAPI(`/alerts/${alertId}/dismiss`, { method: "PATCH" });

// Create alert (direct Supabase insert for reliability)
export const createAlert = async (alert: {
  user_id: string;
  tourist_id: string;
  username: string;
  status: string;
  lat?: number | null;
  lng?: number | null;
  zone_name?: string | null;
  zone_level?: string | null;
  alert_type?: string;
}) => {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      ...alert,
      dismissed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return { data };
};

// Locations
export const updateUserLocation = (location: {
  user_id: string;
  tourist_id: string;
  lat: number;
  lng: number;
  username?: string;
}) =>
  fetchAPI("/locations", {
    method: "POST",
    body: JSON.stringify(location),
  });

// Analytics
export const getAnalytics = () => fetchAPI("/analytics");

// Admin Notifications (direct Supabase for realtime)
export const sendNotification = async (notification: {
  tourist_id: string;
  user_id: string;
  admin_wallet: string;
  message: string;
  notification_type?: string;
}) => {
  const { data, error } = await supabase
    .from('admin_notifications')
    .insert({
      ...notification,
      notification_type: notification.notification_type || 'warning',
      read: false,
    })
    .select()
    .single();

  if (error) throw error;
  return { data };
};

export const getNotificationsForUser = async (touristId: string) => {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .eq('tourist_id', touristId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
};

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) throw error;
};

// Export API object for convenience
export const api = {
  health: checkHealth,
  register: registerUser,
  users: {
    getAll: getAllUsers,
    getById: getUserById,
    updateStatus: updateUserStatus,
  },
  dangerZones: {
    getAll: getDangerZones,
    create: createDangerZone,
    delete: deleteDangerZone,
  },
  alerts: {
    getActive: getActiveAlerts,
    dismiss: dismissAlert,
    create: createAlert,
  },
  locations: {
    update: updateUserLocation,
  },
  notifications: {
    send: sendNotification,
    getForUser: getNotificationsForUser,
    markRead: markNotificationRead,
  },
  analytics: getAnalytics,
};