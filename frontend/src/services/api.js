/**
 * Darkstori API Service
 * Centralized API client for all backend communication.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('auth_token');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        config.headers.Authorization = '';
        return config;
      }
    } catch { /* ignore malformed tokens */ }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new CustomEvent('auth:logout'));
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────────

const login = async (credentials) => {
  const response = await apiClient.post('/api/auth/login', credentials);
  if (response.data.access_token) {
    localStorage.setItem('auth_token', response.data.access_token);
  }
  return response.data;
};

const register = async (userData) => {
  const response = await apiClient.post('/api/auth/register', userData);
  if (response.data.access_token) {
    localStorage.setItem('auth_token', response.data.access_token);
  }
  return response.data;
};

const logout = () => {
  localStorage.removeItem('auth_token');
};

const getMe = async () => {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};

// ── Stores ─────────────────────────────────────────────────────────────────────

const getStores = async (params = {}) => {
  const response = await apiClient.get('/api/stores/', { params });
  return response.data;
};

const getStoreStats = async () => {
  const response = await apiClient.get('/api/stores/stats');
  return response.data;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

const getCoverageGaps = async (params = {}) => {
  const response = await apiClient.get('/api/analytics/coverage-gaps', { params });
  return response.data;
};

const getOrderTrends = async (params = {}) => {
  const response = await apiClient.get('/api/analytics/order-trends', { params });
  return response.data;
};

const getPlatformComparison = async () => {
  const response = await apiClient.get('/api/analytics/platform-comparison');
  return response.data;
};

// ── Advanced Analytics ────────────────────────────────────────────────────────

const getDashboardMetrics = async () => {
  const response = await apiClient.get('/api/analytics/advanced/dashboard/metrics');
  return response.data;
};

const getCityOverview = async () => {
  const response = await apiClient.get('/api/analytics/advanced/city-overview');
  return response.data;
};

const getSentimentOverview = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/analytics/advanced/sentiment-overview', { params });
  return response.data;
};

const getCompetitiveMoves = async (city = null, days = 30) => {
  const params = { days, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/analytics/advanced/competitive-moves', { params });
  return response.data;
};

const exportNeighborhoodsCSV = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.post('/api/analytics/advanced/export/csv', null, {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `neighborhoods_${city || 'all'}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// ── Neighborhoods ─────────────────────────────────────────────────────────────

const getFocusCities = async () => {
  const response = await apiClient.get('/api/neighborhoods/cities');
  return response.data;
};

const getNeighborhoods = async (cityId = null, limit = 50) => {
  const params = { limit, ...(cityId ? { city_id: cityId } : {}) };
  const response = await apiClient.get('/api/neighborhoods/', { params });
  return response.data;
};

const getNeighborhoodById = async (neighborhoodId) => {
  const response = await apiClient.get(`/api/neighborhoods/${neighborhoodId}`);
  return response.data;
};

const getNeighborhoodDNA = async (neighborhoodId) => {
  const response = await apiClient.get(`/api/neighborhoods/${neighborhoodId}/dna`);
  return response.data;
};

const getTopOpportunities = async (limit = 10, city = null) => {
  const params = { limit, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/analytics/advanced/top-opportunities', { params });
  return response.data;
};

// ── Store Simulator ────────────────────────────────────────────────────────────

const predictROI = async (payload) => {
  // payload: { neighborhood_id, investment_amount, store_size_sqft, operating_hours }
  const response = await apiClient.post('/api/simulator/predict', payload);
  return response.data;
};

const quickEstimate = async (neighborhoodId, investment) => {
  const response = await apiClient.get('/api/simulator/quick-estimate', {
    params: { neighborhood_id: neighborhoodId, investment_amount: investment },
  });
  return response.data;
};

const compareNeighborhoods = async (neighborhoodIds, investment) => {
  const response = await apiClient.get('/api/simulator/compare', {
    params: {
      neighborhood_ids: neighborhoodIds.join(','),
      investment_amount: investment,
    },
  });
  return response.data;
};

const proposeLocation = async (simId) => {
  const response = await apiClient.post(`/api/simulator/propose/${simId}`);
  return response.data;
};

const reviewLocation = async (simId, comments) => {
  const response = await apiClient.post(`/api/simulator/review/${simId}`, { comments });
  return response.data;
};

const approveLocation = async (simId) => {
  const response = await apiClient.post(`/api/simulator/approve/${simId}`);
  return response.data;
};

const getProposals = async () => {
  const response = await apiClient.get('/api/simulator/proposals');
  return response.data;
};

// ── Recommendations ───────────────────────────────────────────────────────────

const getCompleteRecommendation = async (neighborhoodId) => {
  const response = await apiClient.get('/api/recommendations/complete', {
    params: { neighborhood_id: neighborhoodId },
  });
  return response.data;
};

const getInventoryRecommendation = async (neighborhoodId, budget = 1600000) => {
  const response = await apiClient.get('/api/recommendations/inventory', {
    params: { neighborhood_id: neighborhoodId, budget },
  });
  return response.data;
};

const getPricingStrategy = async (neighborhoodId) => {
  const response = await apiClient.get('/api/recommendations/pricing', {
    params: { neighborhood_id: neighborhoodId },
  });
  return response.data;
};

const getStoreLayout = async (neighborhoodId, storeSizeSqft = 1500) => {
  const response = await apiClient.get('/api/recommendations/layout', {
    params: { neighborhood_id: neighborhoodId, store_size: storeSizeSqft },
  });
  return response.data;
};

// ── Predictions ────────────────────────────────────────────────────────────────

const getOpportunityZones = async (city = null, limit = 20) => {
  const params = { limit, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/placement/opportunity-zones', { params });
  return response.data;
};

const predictNeighborhoodDemand = async (neighborhoodId) => {
  const response = await apiClient.post('/api/predictions/predict-demand', null, {
    params: { neighborhood_id: neighborhoodId },
  });
  return response.data;
};

const getCityForecast = async (city) => {
  const response = await apiClient.get('/api/predictions/forecast', { params: { city } });
  return response.data;
};

const getForecastNeighborhoods = async () => {
  const response = await apiClient.get('/api/predictions/neighborhoods');
  return response.data;
};

const getDemandForecast = async (payload) => {
  const response = await apiClient.post('/api/predictions/predict', payload);
  return response.data;
};

// ── Analytics: Heatmap ─────────────────────────────────────────────────────────

const getOrderHeatmap = async (city = null, days = 90) => {
  const params = { days, limit: 5000 };
  if (city) params.city = city;
  const response = await apiClient.get('/api/analytics/order-heatmap', { params });
  return response.data;
};

// ── ML Models ──────────────────────────────────────────────────────────────────

const getModelList = async () => {
  const response = await apiClient.get('/api/v1/ml/models');
  return response.data;
};

const getModelInfo = async (modelName = 'demand_forecasting_model', stage = 'Production') => {
  const response = await apiClient.get('/api/v1/ml/model/info', {
    params: { model_name: modelName, stage },
  });
  return response.data;
};

const getSchedulerJobs = async () => {
  const response = await apiClient.get('/api/v1/ml/scheduler/jobs');
  return response.data;
};

const getMLSettings = async () => {
  const response = await apiClient.get('/api/v1/ml/settings');
  return response.data;
};

const updateMLSettings = async (autoRetrain) => {
  const response = await apiClient.post('/api/v1/ml/settings', { auto_retrain_enabled: autoRetrain });
  return response.data;
};

const checkDriftAndRetrain = async () => {
  const response = await apiClient.post('/api/v1/ml/check-drift');
  return response.data;
};

const getAuditLogs = async () => {
  const response = await apiClient.get('/api/simulator/audit-logs');
  return response.data;
};

// ── Placement AI ────────────────────────────────────────────────────────────────

const getPlacementScores = async (city) => {
  const response = await apiClient.get(`/api/placement/score/${city}`);
  return response.data;
};

const getPlacementSummary = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/placement/summary', { params });
  return response.data;
};

const getTopPlacementOpps = async (limit = 10) => {
  const response = await apiClient.get('/api/placement/top', { params: { limit } });
  return response.data;
};

// ── Unit Economics ──────────────────────────────────────────────────────────────

const projectEconomics = async (params) => {
  const response = await apiClient.post('/api/economics/project', params);
  return response.data;
};

const getEconomicsBenchmarks = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/economics/benchmarks', { params });
  return response.data;
};

const listEconomicsProjections = async () => {
  const response = await apiClient.get('/api/economics/projections');
  return response.data;
};

// ── Delivery SLA ────────────────────────────────────────────────────────────────

const getSLAMetrics = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/sla/metrics', { params });
  return response.data;
};

// ── Cohorts ─────────────────────────────────────────────────────────────────────

const getCohorts = async () => {
  const response = await apiClient.get('/api/cohorts');
  return response.data;
};

// ── Zero-Waste Resilience Engine ────────────────────────────────────────────────

const getResilienceBatches = async (city = null, category = null) => {
  const params = {};
  if (city) params.city = city;
  if (category) params.category = category;
  const response = await apiClient.get('/api/resilience/batches', { params });
  return response.data;
};

const simulateDecay = async (hours, city = null, tempFailure = false) => {
  const payload = { hours, city, temp_failure: tempFailure };
  const response = await apiClient.post('/api/resilience/batches/decay', payload);
  return response.data;
};

const scanQRCrate = async (qrCodeHash, storeId = null) => {
  const payload = { qr_code_hash: qrCodeHash };
  if (storeId) payload.store_id = storeId;
  const response = await apiClient.post('/api/resilience/batches/scan-qr', payload);
  return response.data;
};

const verifyPhoto = async (payload) => {
  // payload: { batch_id, photo_url, bruising_percent, color_state, freshness_score }
  const response = await apiClient.post('/api/resilience/batches/verify-photo', payload);
  return response.data;
};

const ocrExpiry = async (imageUrl) => {
  const payload = { image_url: imageUrl };
  const response = await apiClient.post('/api/resilience/batches/ocr-expiry', payload);
  return response.data;
};

// ── Health ─────────────────────────────────────────────────────────────────────

const getHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

// ── Named export ──────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login,
  register,
  logout,
  getMe,

  // Stores
  getStores,
  getStoreStats,

  // Analytics
  getCoverageGaps,
  getOrderHeatmap,
  getOrderTrends,
  getPlatformComparison,

  // Advanced Analytics
  getDashboardMetrics,
  getCityOverview,
  getSentimentOverview,
  getCompetitiveMoves,
  exportNeighborhoodsCSV,

  // Neighborhoods
  getFocusCities,
  getNeighborhoods,
  getNeighborhoodById,
  getNeighborhoodDNA,
  getTopOpportunities,

  // Simulator
  predictROI,
  quickEstimate,
  compareNeighborhoods,
  proposeLocation,
  reviewLocation,
  approveLocation,
  getProposals,

  // Recommendations
  getCompleteRecommendation,
  getInventoryRecommendation,
  getPricingStrategy,
  getStoreLayout,

  // Predictions
  getOpportunityZones,
  predictNeighborhoodDemand,
  getCityForecast,
  getForecastNeighborhoods,
  getDemandForecast,

  // Placement AI
  getPlacementScores,
  getPlacementSummary,
  getTopPlacementOpps,

  // Unit Economics
  projectEconomics,
  getEconomicsBenchmarks,
  listEconomicsProjections,

  // Delivery SLA
  getSLAMetrics,

  // Cohorts
  getCohorts,

  // ML Models
  getModelList,
  getModelInfo,
  getSchedulerJobs,
  getMLSettings,
  updateMLSettings,
  checkDriftAndRetrain,
  getAuditLogs,

  // Resilience
  getResilienceBatches,
  simulateDecay,
  scanQRCrate,
  verifyPhoto,
  ocrExpiry,

  // System
  getHealth,
};

export default apiClient;

