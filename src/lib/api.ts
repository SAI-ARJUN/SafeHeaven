const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchAPI(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

// Profiles
export const getProfiles = () => fetchAPI("/profiles");
export const getProfileById = (id: number) => fetchAPI(`/profiles/${id}`);
export const getProfileByEmail = (email: string) => fetchAPI(`/profiles/email/${email}`);
export const createProfile = (profile: {
  email: string;
  name?: string;
  phone?: string;
  status?: string;
  location_status?: string;
}) =>
  fetchAPI("/profiles", {
    method: "POST",
    body: JSON.stringify(profile),
  });
export const updateProfile = (id: number, profile: {
  name?: string;
  phone?: string;
  status?: string;
  location_status?: string;
}) =>
  fetchAPI(`/profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(profile),
  });

// Alerts
export const getAlerts = () => fetchAPI("/alerts");
export const getAlertById = (id: number) => fetchAPI(`/alerts/${id}`);
export const createAlert = async (alert: {
  profile_id?: number | string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  severity?: string;
  description?: string;
}) =>
  fetchAPI("/alerts", {
    method: "POST",
    body: JSON.stringify(alert),
  });
export const dismissAlert = (id: number) =>
  fetchAPI(`/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ dismissed: true }),
  });
export const deleteAlert = (id: number) =>
  fetchAPI(`/alerts/${id}`, { method: "DELETE" });

// Danger Zones
export const getDangerZones = () => fetchAPI("/danger-zones");
export const getDangerZoneById = (id: number) => fetchAPI(`/danger-zones/${id}`);
export const createDangerZone = (zone: {
  name: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  severity?: string;
  description?: string;
}) =>
  fetchAPI("/danger-zones", {
    method: "POST",
    body: JSON.stringify(zone),
  });
export const updateDangerZone = (id: number, zone: {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  severity?: string;
  description?: string;
}) =>
  fetchAPI(`/danger-zones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(zone),
  });
export const deleteDangerZone = (id: number) =>
  fetchAPI(`/danger-zones/${id}`, { method: "DELETE" });

// Locations
export const getLocations = () => fetchAPI("/locations");
export const getLocationsByProfile = (profileId: number | string) => fetchAPI(`/locations/profile/${profileId}`);
export const createLocation = (location: {
  profile_id: number | string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}) =>
  fetchAPI("/locations", {
    method: "POST",
    body: JSON.stringify(location),
  });
export const updateProfileLocation = (profileId: number | string, location: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  location_status?: string;
}) =>
  fetchAPI(`/locations/profile/${profileId}`, {
    method: "PUT",
    body: JSON.stringify(location),
  });

// Notifications
export const getNotifications = () => fetchAPI("/notifications");
export const getNotificationsByProfile = (profileId: number | string) => fetchAPI(`/notifications/profile/${profileId}`);
export const createNotification = (notification: {
  profile_id?: number | string;
  message: string;
}) =>
  fetchAPI("/notifications", {
    method: "POST",
    body: JSON.stringify(notification),
  });
export const markNotificationRead = (id: number) =>
  fetchAPI(`/notifications/${id}`, {
    method: "PATCH",
  });
export const deleteNotification = (id: number) =>
  fetchAPI(`/notifications/${id}`, { method: "DELETE" });

// Export API object for convenience
export const api = {
  health: checkHealth,
  profiles: {
    getAll: getProfiles,
    getById: getProfileById,
    getByEmail: getProfileByEmail,
    create: createProfile,
    update: updateProfile,
  },
  alerts: {
    getAll: getAlerts,
    getById: getAlertById,
    create: createAlert,
    dismiss: dismissAlert,
    delete: deleteAlert,
  },
  dangerZones: {
    getAll: getDangerZones,
    getById: getDangerZoneById,
    create: createDangerZone,
    update: updateDangerZone,
    delete: deleteDangerZone,
  },
  locations: {
    getAll: getLocations,
    getByProfile: getLocationsByProfile,
    create: createLocation,
    updateProfileLocation: updateProfileLocation,
  },
  notifications: {
    getAll: getNotifications,
    getByProfile: getNotificationsByProfile,
    create: createNotification,
    markRead: markNotificationRead,
    delete: deleteNotification,
  },
};
