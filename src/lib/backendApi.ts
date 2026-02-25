// API Client for Node.js Backend

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

export const api = {
  // Auth endpoints
  auth: {
    login: (tourist_id, password) => apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tourist_id, password }),
    }),
    loginWithWallet: (wallet_address) => apiCall('/auth/login/wallet', {
      method: 'POST',
      body: JSON.stringify({ wallet_address }),
    }),
    register: (data) => apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Profiles endpoints
  profiles: {
    getAll: () => apiCall('/profiles'),
    getByTouristId: (tourist_id) => apiCall(`/profiles/${tourist_id}`),
    update: (tourist_id, data) => apiCall(`/profiles/${tourist_id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  // Alerts endpoints
  alerts: {
    getAll: () => apiCall('/alerts'),
    create: (data) => apiCall('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    dismiss: (id) => apiCall(`/alerts/${id}/dismiss`, {
      method: 'PUT',
    }),
  },

  // Locations endpoints
  locations: {
    getAll: () => apiCall('/locations'),
    update: (data) => apiCall('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Danger zones endpoints
  dangerZones: {
    getAll: () => apiCall('/zones'),
    create: (data) => apiCall('/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id) => apiCall(`/zones/${id}`, {
      method: 'DELETE',
    }),
  },

  // Notifications endpoints
  notifications: {
    getByTouristId: (tourist_id) => apiCall(`/notifications/tourist/${tourist_id}`),
    create: (data) => apiCall('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    markAsRead: (id) => apiCall(`/notifications/${id}/read`, {
      method: 'PUT',
    }),
  },
};
