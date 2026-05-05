import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Stores
  getStores: async (params = {}) => {
    const response = await apiClient.get('/api/stores', { params });
    return response.data;
  },

  getStoreStats: async () => {
    const response = await apiClient.get('/api/stores/stats');
    return response.data;
  },

  getStore: async (id) => {
    const response = await apiClient.get(`/api/stores/${id}`);
    return response.data;
  },

  createStore: async (data) => {
    const response = await apiClient.post('/api/stores', data);
    return response.data;
  },

  // Analytics
  getCoverageGaps: async (params = {}) => {
    const response = await apiClient.get('/api/analytics/coverage-gaps', { params });
    return response.data;
  },

  getCoverageByTier: async () => {
    const response = await apiClient.get('/api/analytics/coverage-by-tier');
    return response.data;
  },

  getOrderTrends: async (params = {}) => {
    const response = await apiClient.get('/api/analytics/order-trends', { params });
    return response.data;
  },

  getPlatformComparison: async () => {
    const response = await apiClient.get('/api/analytics/platform-comparison');
    return response.data;
  },

  // Predictions
  getForecast: async (days = 30) => {
    const response = await apiClient.get('/api/predictions/forecast', {
      params: { days },
    });
    return response.data;
  },

  getOpportunityZones: async (limit = 50) => {
    const response = await apiClient.get('/api/predictions/opportunity-zones', {
      params: { limit },
    });
    return response.data;
  },

  predictDemand: async (data) => {
    const response = await apiClient.post('/api/predictions/predict-demand', data);
    return response.data;
  },

  // Auth
  login: async (credentials) => {
    const response = await apiClient.post('/api/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/api/auth/register', userData);
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },

  // Live Data
  getLiveMetrics: async () => {
    const response = await apiClient.get('/api/live/metrics');
    return response.data;
  },

  getNearbyStores: async (lat, lng, radius = 5000) => {
    const response = await apiClient.get('/api/live/stores/nearby', {
      params: { lat, lng, radius },
    });
    return response.data;
  },
};

export default apiClient;
