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

// Handle 401 globally with token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !originalRequest.url?.includes('/auth/')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          const { data } = await apiClient.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
          localStorage.setItem('auth_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          processQueue(null, data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new CustomEvent('auth:logout'));
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
      // No refresh token available — force logout
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
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
  const response = await apiClient.post('/api/v1/auth/login', credentials);
  if (response.data.access_token) {
    localStorage.setItem('auth_token', response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
  }
  return response.data;
};

const register = async (userData) => {
  const response = await apiClient.post('/api/v1/auth/register', userData);
  if (response.data.access_token) {
    localStorage.setItem('auth_token', response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
  }
  return response.data;
};

const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    await apiClient.post('/api/v1/auth/logout', { refresh_token: refreshToken || '' });
  } catch (e) {
    // Best-effort server-side logout — continue with local cleanup
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
};

const getMe = async () => {
  const response = await apiClient.get('/api/v1/auth/me');
  return response.data;
};

// ── Stores ─────────────────────────────────────────────────────────────────────

const getStores = async (params = {}) => {
  const response = await apiClient.get('/api/v1/stores/', { params });
  return response.data;
};

const getStoreWeatherAlert = async (storeId) => {
  const response = await apiClient.get(`/api/v1/stores/${storeId}/weather-alert`);
  return response.data;
};

const getStoreStats = async () => {
  const response = await apiClient.get('/api/v1/stores/stats');
  return response.data;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

const getCoverageGaps = async (params = {}) => {
  const response = await apiClient.get('/api/v1/analytics/coverage-gaps', { params });
  return response.data;
};

const getOrderTrends = async (params = {}) => {
  const response = await apiClient.get('/api/v1/analytics/order-trends', { params });
  return response.data;
};

const getPlatformComparison = async () => {
  const response = await apiClient.get('/api/v1/analytics/platform-comparison');
  return response.data;
};

// ── Advanced Analytics ────────────────────────────────────────────────────────

const getDashboardMetrics = async () => {
  const response = await apiClient.get('/api/v1/analytics/advanced/dashboard/metrics');
  return response.data;
};

const getCityOverview = async () => {
  const response = await apiClient.get('/api/v1/analytics/advanced/city-overview');
  return response.data;
};

const getSentimentOverview = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/v1/analytics/advanced/sentiment-overview', { params });
  return response.data;
};

const getCompetitiveMoves = async (city = null, days = 30) => {
  const params = { days, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/v1/analytics/advanced/competitive-moves', { params });
  return response.data;
};

const exportNeighborhoodsCSV = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.post('/api/v1/analytics/advanced/export/csv', null, {
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
  const response = await apiClient.get('/api/v1/neighborhoods/cities');
  return response.data;
};

const getNeighborhoods = async (cityId = null, limit = 50) => {
  const params = { limit, ...(cityId ? { city_id: cityId } : {}) };
  const response = await apiClient.get('/api/v1/neighborhoods/', { params });
  return response.data;
};

const getNeighborhoodById = async (neighborhoodId) => {
  const response = await apiClient.get(`/api/v1/neighborhoods/${neighborhoodId}`);
  return response.data;
};

const getNeighborhoodDNA = async (neighborhoodId) => {
  const response = await apiClient.get(`/api/v1/neighborhoods/${neighborhoodId}/dna`);
  return response.data;
};

const getTopOpportunities = async (limit = 10, city = null) => {
  const params = { limit, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/v1/analytics/advanced/top-opportunities', { params });
  return response.data;
};

// ── Store Simulator ────────────────────────────────────────────────────────────

const predictROI = async (payload) => {
  // payload: { neighborhood_id, investment_amount, store_size_sqft, operating_hours }
  const response = await apiClient.post('/api/v1/simulator/predict', payload);
  return response.data;
};

const quickEstimate = async (neighborhoodId, investment) => {
  const response = await apiClient.get('/api/v1/simulator/quick-estimate', {
    params: { neighborhood_id: neighborhoodId, investment_amount: investment },
  });
  return response.data;
};

const compareNeighborhoods = async (neighborhoodIds, investment) => {
  const response = await apiClient.get('/api/v1/simulator/compare', {
    params: {
      neighborhood_ids: neighborhoodIds.join(','),
      investment_amount: investment,
    },
  });
  return response.data;
};

const proposeLocation = async (simId) => {
  const response = await apiClient.post(`/api/v1/simulator/propose/${simId}`);
  return response.data;
};

const reviewLocation = async (simId, comments) => {
  const response = await apiClient.post(`/api/v1/simulator/review/${simId}`, { comments });
  return response.data;
};

const approveLocation = async (simId) => {
  const response = await apiClient.post(`/api/v1/simulator/approve/${simId}`);
  return response.data;
};

const getProposals = async () => {
  const response = await apiClient.get('/api/v1/simulator/proposals');
  return response.data;
};

// ── Recommendations ───────────────────────────────────────────────────────────

const getCompleteRecommendation = async (neighborhoodId) => {
  const response = await apiClient.get('/api/v1/recommendations/complete', {
    params: { neighborhood_id: neighborhoodId },
  });
  return response.data;
};

const getInventoryRecommendation = async (neighborhoodId, budget = 1600000) => {
  const response = await apiClient.get('/api/v1/recommendations/inventory', {
    params: { neighborhood_id: neighborhoodId, budget },
  });
  return response.data;
};

const getPricingStrategy = async (neighborhoodId) => {
  const response = await apiClient.get('/api/v1/recommendations/pricing', {
    params: { neighborhood_id: neighborhoodId },
  });
  return response.data;
};

const getStoreLayout = async (neighborhoodId, storeSizeSqft = 1500) => {
  const response = await apiClient.get('/api/v1/recommendations/layout', {
    params: { neighborhood_id: neighborhoodId, store_size: storeSizeSqft },
  });
  return response.data;
};

// ── Predictions ────────────────────────────────────────────────────────────────

const getOpportunityZones = async (city = null, limit = 20) => {
  const params = { limit, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/v1/placement/opportunity-zones', { params });
  return response.data;
};

const predictNeighborhoodDemand = async (neighborhoodId) => {
  const response = await apiClient.post('/api/v1/predictions/predict-demand', null, {
    params: { neighborhood_id: neighborhoodId },
  });
  return response.data;
};

const getCityForecast = async (city) => {
  const response = await apiClient.get('/api/v1/predictions/forecast', { params: { city } });
  return response.data;
};

const getForecastNeighborhoods = async () => {
  const response = await apiClient.get('/api/v1/predictions/neighborhoods');
  return response.data;
};

const getDemandForecast = async (payload) => {
  const response = await apiClient.post('/api/v1/predictions/predict', payload);
  return response.data;
};

// ── Analytics: Heatmap ─────────────────────────────────────────────────────────

const getOrderHeatmap = async (city = null, days = 90) => {
  const params = { days, limit: 5000 };
  if (city) params.city = city;
  const response = await apiClient.get('/api/v1/analytics/order-heatmap', { params });
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

const trainModel = async () => {
  const response = await apiClient.post('/api/v1/ml/train');
  return response.data;
};

const getAuditLogs = async () => {
  const response = await apiClient.get('/api/v1/simulator/audit-logs');
  return response.data;
};

// ── Placement AI ────────────────────────────────────────────────────────────────

const getPlacementScores = async (city) => {
  const response = await apiClient.get(`/api/v1/placement/score/${city}`);
  return response.data;
};

const getPlacementSummary = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/v1/placement/summary', { params });
  return response.data;
};

const getTopPlacementOpps = async (limit = 10) => {
  const response = await apiClient.get('/api/v1/placement/top', { params: { limit } });
  return response.data;
};

// ── Unit Economics ──────────────────────────────────────────────────────────────

const projectEconomics = async (params) => {
  const response = await apiClient.post('/api/v1/economics/project', params);
  return response.data;
};

const getEconomicsBenchmarks = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/v1/economics/benchmarks', { params });
  return response.data;
};

const listEconomicsProjections = async () => {
  const response = await apiClient.get('/api/v1/economics/projections');
  return response.data;
};

// ── Delivery SLA ────────────────────────────────────────────────────────────────

const getSLAMetrics = async (city = null) => {
  const params = city ? { city } : {};
  const response = await apiClient.get('/api/v1/sla/metrics', { params });
  return response.data;
};

const getBatchDispatch = async (payload = {}) => {
  const response = await apiClient.post('/api/v1/sla/batch-dispatch', payload);
  return response.data;
};

// ── Cohorts ─────────────────────────────────────────────────────────────────────

const getCohorts = async () => {
  const response = await apiClient.get('/api/v1/cohorts');
  return response.data;
};

// ── Zero-Waste Resilience Engine ────────────────────────────────────────────────

const getResilienceBatches = async (city = null, category = null) => {
  const params = {};
  if (city) params.city = city;
  if (category) params.category = category;
  const response = await apiClient.get('/api/v1/resilience/batches', { params });
  return response.data;
};

const simulateDecay = async (hours, city = null, tempFailure = false) => {
  const payload = { hours, city, temp_failure: tempFailure };
  const response = await apiClient.post('/api/v1/resilience/batches/decay', payload);
  return response.data;
};

const scanQRCrate = async (qrCodeHash, storeId = null) => {
  const payload = { qr_code_hash: qrCodeHash };
  if (storeId) payload.store_id = storeId;
  const response = await apiClient.post('/api/v1/resilience/batches/scan-qr', payload);
  return response.data;
};

const verifyPhoto = async (payload) => {
  // payload: { batch_id, photo_url, bruising_percent, color_state, freshness_score }
  const response = await apiClient.post('/api/v1/resilience/batches/verify-photo', payload);
  return response.data;
};

const ocrExpiry = async (imageUrl) => {
  const payload = { image_url: imageUrl };
  const response = await apiClient.post('/api/v1/resilience/batches/ocr-expiry', payload);
  return response.data;
};

// ── Health ─────────────────────────────────────────────────────────────────────

const getHealth = async () => {
  const response = await apiClient.get('/health/live');
  return response.data;
};

const getHealthReady = async () => {
  const response = await apiClient.get('/health/ready');
  return response.data;
};

const resolveLocation = async (q) => {
  const response = await apiClient.get('/api/v1/geo/resolve', { params: { q } });
  return response.data;
};

const analyzeLocation = async (params) => {
  const response = await apiClient.get('/api/v1/geo/analyze', { params });
  return response.data;
};

// â”€â”€ Expansion Intelligence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getExpansionOpportunities = async (city = null, limit = 8) => {
  const params = { limit, ...(city ? { city } : {}) };
  const response = await apiClient.get('/api/v1/expansion/opportunities', { params });
  return response.data;
};

const simulateExpansion = async (neighborhoodId, payload = {}) => {
  const response = await apiClient.post(`/api/v1/expansion/simulate/${neighborhoodId}`, null, {
    params: payload,
  });
  return response.data;
};

const getExpansionLedger = async (params = {}) => {
  const response = await apiClient.get('/api/v1/expansion/ledger', { params });
  return response.data;
};

const reviewExpansionDecision = async (simulationId, review_notes) => {
  const response = await apiClient.post(`/api/v1/expansion/decisions/${simulationId}/review`, { review_notes });
  return response.data;
};

const approveExpansionDecision = async (simulationId) => {
  const response = await apiClient.post(`/api/v1/expansion/decisions/${simulationId}/approve`);
  return response.data;
};

// ── Local Events ──────────────────────────────────────────────────────────────

const getEvents = async (params) => {
  const response = await apiClient.get('/api/v1/events/', { params });
  return response.data;
};

const createEvent = async (payload) => {
  const response = await apiClient.post('/api/v1/events/', payload);
  return response.data;
};

const updateEvent = async (eventId, payload) => {
  const response = await apiClient.put(`/api/v1/events/${eventId}`, payload);
  return response.data;
};

const deleteEvent = async (eventId) => {
  const response = await apiClient.delete(`/api/v1/events/${eventId}`);
  return response.data;
};

// ── Playbook Automation ──────────────────────────────────────────────────────

const getPlaybooks = async (params) => {
  const response = await apiClient.get('/api/v1/playbooks/', { params });
  return response.data;
};

const createPlaybook = async (payload) => {
  const response = await apiClient.post('/api/v1/playbooks/', payload);
  return response.data;
};

const updatePlaybook = async (id, payload) => {
  const response = await apiClient.put(`/api/v1/playbooks/${id}`, payload);
  return response.data;
};

const deletePlaybook = async (id) => {
  const response = await apiClient.delete(`/api/v1/playbooks/${id}`);
  return response.data;
};

const togglePlaybook = async (id) => {
  const response = await apiClient.post(`/api/v1/playbooks/${id}/toggle`);
  return response.data;
};

const testPlaybook = async (id, eventData) => {
  const response = await apiClient.post(`/api/v1/playbooks/${id}/test`, { event_data: eventData });
  return response.data;
};

const getPlaybookExecutions = async (params) => {
  const response = await apiClient.get('/api/v1/playbooks/executions', { params });
  return response.data;
};

const getPlaybookStats = async () => {
  const response = await apiClient.get('/api/v1/playbooks/stats');
  return response.data;
};

const getPlaybookTriggers = async () => {
  const response = await apiClient.get('/api/v1/playbooks/triggers');
  return response.data;
};

const getPlaybookActions = async () => {
  const response = await apiClient.get('/api/v1/playbooks/actions');
  return response.data;
};

// ── Cannibalization Simulator ─────────────────────────────────────────────────

const analyzeCannibalization = async (payload) => {
  const response = await apiClient.post('/api/v1/cannibalization/analyze', payload);
  return response.data;
};

const getCannibalizationHistory = async (params) => {
  const response = await apiClient.get('/api/v1/cannibalization/history', { params });
  return response.data;
};

// ── Neighborhood Mood Score ──────────────────────────────────────────────────

const getNeighborhoodMood = async (neighborhoodId) => {
  const response = await apiClient.get(`/api/v1/mood/neighborhood/${neighborhoodId}`);
  return response.data;
};

const getCityMood = async (city) => {
  const response = await apiClient.get(`/api/v1/mood/city/${city}`);
  return response.data;
};

const getMoodSummary = async () => {
  const response = await apiClient.get('/api/v1/mood/summary');
  return response.data;
};

// ── Named export ──────────────────────────────────────────────────────────────

export const api = {
  // Local Events
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,

  // Auth
  login,
  register,
  logout,
  getMe,

  // Stores
  getStores,
  getStoreStats,
  getStoreWeatherAlert,

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
  getBatchDispatch,

  // Cohorts
  getCohorts,

  // ML Models
  getModelList,
  getModelInfo,
  getSchedulerJobs,
  getMLSettings,
  updateMLSettings,
  checkDriftAndRetrain,
  trainModel,
  getAuditLogs,

  // Resilience
  getResilienceBatches,
  simulateDecay,
  scanQRCrate,
  verifyPhoto,
  ocrExpiry,

  // System
  getHealth,
  getHealthReady,

  // Expansion Intelligence
  getExpansionOpportunities,
  simulateExpansion,
  getExpansionLedger,
  reviewExpansionDecision,
  approveExpansionDecision,

  // Geo Intelligence
  resolveLocation,
  analyzeLocation,

  // Playbook Automation
  getPlaybooks,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
  togglePlaybook,
  testPlaybook,
  getPlaybookExecutions,
  getPlaybookStats,
  getPlaybookTriggers,
  getPlaybookActions,

  // Cannibalization
  analyzeCannibalization,
  getCannibalizationHistory,

  // Mood Score
  getNeighborhoodMood,
  getCityMood,
  getMoodSummary,
};

export default apiClient;
