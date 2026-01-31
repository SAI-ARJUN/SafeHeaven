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
  },
  locations: {
    update: updateUserLocation,
  },
  analytics: getAnalytics,
};