/**
 * Fallback Datasets for Darkstori Frontend
 * Centralized dataset constants used when live API response is empty or pending.
 * Each dataset marks `is_fallback: true` for UI awareness.
 */

export const FALLBACK_DASHBOARD_METRICS = {
  is_fallback: true,
  summary: {
    total_stores: 42,
    total_neighborhoods: 85,
    total_orders_30d: 118420,
    total_competitive_moves: 24,
  },
  city_overview: [
    { city: 'North Zone', store_count: 12, neighborhood_count: 24, avg_opportunity_score: 8.2 },
    { city: 'West Zone', store_count: 8, neighborhood_count: 16, avg_opportunity_score: 7.1 },
    { city: 'Central Zone', store_count: 10, neighborhood_count: 20, avg_opportunity_score: 7.8 },
    { city: 'South Zone', store_count: 7, neighborhood_count: 15, avg_opportunity_score: 8.0 },
    { city: 'Growth Zone', store_count: 5, neighborhood_count: 10, avg_opportunity_score: 7.4 },
  ],
  top_opportunities: [
    { neighborhood_id: 1, neighborhood_name: 'Central Ward', city: 'North Zone', opportunity_score: 9.2 },
    { neighborhood_id: 2, neighborhood_name: 'North Market', city: 'North Zone', opportunity_score: 8.9 },
    { neighborhood_id: 3, neighborhood_name: 'Transit Hub', city: 'Central Zone', opportunity_score: 8.2 },
    { neighborhood_id: 4, neighborhood_name: 'Residential Edge', city: 'West Zone', opportunity_score: 9.0 },
    { neighborhood_id: 5, neighborhood_name: 'Growth Corridor', city: 'South Zone', opportunity_score: 8.8 },
    { neighborhood_id: 6, neighborhood_name: 'Logistics Belt', city: 'Growth Zone', opportunity_score: 8.5 },
  ],
  sentiment: [
    { platform: 'Instamart', positive_pct: 68, negative_pct: 12, avg_sentiment: 0.56 },
    { platform: 'Zepto', positive_pct: 72, negative_pct: 10, avg_sentiment: 0.62 },
    { platform: 'Blinkit', positive_pct: 61, negative_pct: 18, avg_sentiment: 0.43 },
    { platform: 'Swiggy Genie', positive_pct: 54, negative_pct: 22, avg_sentiment: 0.32 },
  ],
  recent_competitive_moves: {
    moves: [
      { move_id: 1, platform: 'Zepto', move_type: 'payout_increase', description: 'Increased rider payout structure in a high-density market.', city: 'North Zone', impact_level: 'HIGH' },
      { move_id: 2, platform: 'Blinkit', move_type: 'dark_store_launch', description: 'Opened a new large-format dark store in a competitive market.', city: 'West Zone', impact_level: 'MEDIUM' },
      { move_id: 3, platform: 'Instamart', move_type: 'free_delivery_promo', description: 'Launched a free delivery promo for orders above 99 in a growth market.', city: 'Growth Zone', impact_level: 'LOW' },
    ]
  }
};

export const FALLBACK_RESILIENCE_ALERTS = [
  { id: 'ALT-101', title: 'Feature Drift Detected: temp_celsius', description: 'Kolmogorov-Smirnov statistics (KS=0.178) exceeded threshold of 0.150 in a sample market.', severity: 'MEDIUM', timestamp: '10:42:15', category: 'drift', is_fallback: true },
  { id: 'ALT-102', title: 'SLA Breach Threshold Violated', description: 'Fulfillment times in PIN 000001 spiked to 18.2 min (threshold 15 min).', severity: 'HIGH', timestamp: '10:38:00', category: 'sla', is_fallback: true },
  { id: 'ALT-103', title: 'Model Drift Warning: demand_forecasting_model', description: 'Validation MAPE drifted to 18.2% (threshold 15.0%) on staging run.', severity: 'HIGH', timestamp: '10:35:12', category: 'drift', is_fallback: true },
  { id: 'ALT-104', title: 'Minor Latency Spike: prediction_api', description: 'P95 response latency crossed 120ms (currently 132ms) in the expansion service.', severity: 'LOW', timestamp: '10:15:44', category: 'system', is_fallback: true }
];

export const FALLBACK_MODEL_REGISTRY = [
  { name: 'demand_forecasting_model', latest_version: '3.1.0', production_version: '3.0.0', staging_version: '3.1.0-rc', is_fallback: true },
  { name: 'darkstore_placement_xgb', latest_version: '2.0.4', production_version: '2.0.4', staging_version: '2.1.0-beta', is_fallback: true },
  { name: 'pricing_salvage_sigmoid', latest_version: '1.8.2', production_version: '1.8.0', staging_version: '1.8.2', is_fallback: true }
];

export const FALLBACK_SHAP_FEATURES = [
  { feature: 'lag_1_orders', value: 0.38 },
  { feature: 'working_professionals_pct', value: 0.24 },
  { feature: 'population_density', value: 0.18 },
  { feature: 'avg_household_income', value: 0.12 },
  { feature: 'price_sensitivity', value: 0.08 }
];

export const FALLBACK_RUN_COMPARISON = {
  metrics: [
    { name: 'R² Score', run_3_1_0: '0.88', run_2_4_1: '0.81', better: 'run_3_1_0' },
    { name: 'MAPE (%)', run_3_1_0: '11.4', run_2_4_1: '14.8', better: 'run_3_1_0' },
    { name: 'Inference Latency (ms)', run_3_1_0: '14', run_2_4_1: '22', better: 'run_3_1_0' },
    { name: 'Memory Footprint (MB)', run_3_1_0: '142', run_2_4_1: '118', better: 'run_2_4_1' }
  ]
};

export const FALLBACK_COVERAGE_GAPS = [
  { pincode: '560001', neighborhood_name: 'Koramangala Gaps', coverage_score: 35, orders_7d: 1240, is_fallback: true },
  { pincode: '560034', neighborhood_name: 'HSR Layout South', coverage_score: 48, orders_7d: 850, is_fallback: true },
  { pincode: '560008', neighborhood_name: 'Indiranagar Central', coverage_score: 55, orders_7d: 2100, is_fallback: true },
  { pincode: '560095', neighborhood_name: 'Koramangala Extension', coverage_score: 72, orders_7d: 930, is_fallback: true },
  { pincode: '560076', neighborhood_name: 'JP Nagar West', coverage_score: 84, orders_7d: 1540, is_fallback: true },
];

export const FALLBACK_ORDER_TRENDS = [
  { date: '2026-07-08', orders: 320, revenue: 112000, is_fallback: true },
  { date: '2026-07-10', orders: 345, revenue: 120750, is_fallback: true },
  { date: '2026-07-12', orders: 310, revenue: 108500, is_fallback: true },
  { date: '2026-07-14', orders: 380, revenue: 133000, is_fallback: true },
  { date: '2026-07-16', orders: 420, revenue: 147000, is_fallback: true },
  { date: '2026-07-18', orders: 395, revenue: 138250, is_fallback: true },
  { date: '2026-07-20', orders: 450, revenue: 157500, is_fallback: true },
  { date: '2026-07-22', orders: 490, revenue: 171500, is_fallback: true },
  { date: '2026-07-24', orders: 460, revenue: 161000, is_fallback: true },
  { date: '2026-07-26', orders: 510, revenue: 178500, is_fallback: true },
  { date: '2026-07-28', orders: 530, revenue: 185500, is_fallback: true },
  { date: '2026-07-30', orders: 580, revenue: 203000, is_fallback: true },
];

export const FALLBACK_FORECAST_ZONES = [
  { pincode: '000001', neighborhood_name: 'Central Ward', city: 'Sample Market', population: 75000, population_density: 6200.0, avg_household_income: 950000.0, is_fallback: true },
  { pincode: '000002', neighborhood_name: 'North Market', city: 'Sample Market', population: 45000, population_density: 8000.0, avg_household_income: 800000.0, is_fallback: true },
  { pincode: '000003', neighborhood_name: 'Transit Hub', city: 'Sample Market', population: 90000, population_density: 12000.0, avg_household_income: 1100000.0, is_fallback: true },
  { pincode: '000004', neighborhood_name: 'Residential Edge', city: 'Sample Market', population: 65000, population_density: 5400.0, avg_household_income: 850000.0, is_fallback: true },
  { pincode: '000005', neighborhood_name: 'Growth Corridor', city: 'Sample Market', population: 55000, population_density: 5800.0, avg_household_income: 720000.0, is_fallback: true },
];

export const FALLBACK_FOCUS_CITIES = [
  { id: 1, name: 'Bangalore', is_active: true, darkstore_count: 18, is_fallback: true },
  { id: 2, name: 'Delhi', is_active: true, darkstore_count: 14, is_fallback: true },
  { id: 3, name: 'Hyderabad', is_active: true, darkstore_count: 10, is_fallback: true },
];

export const FALLBACK_NEIGHBORHOODS = [
  { neighborhood_id: 1, city: 'Bangalore', neighborhood_name: 'Koramangala', pincode: '560034', population: 150000, avg_household_income: 950000.0, working_professionals_pct: 72.0, price_sensitivity: 'High', competition_intensity: 'High', market_potential_score: 9.2, is_fallback: true },
  { neighborhood_id: 2, city: 'Bangalore', neighborhood_name: 'Indiranagar', pincode: '560038', population: 120000, avg_household_income: 1100000.0, working_professionals_pct: 68.0, price_sensitivity: 'High', competition_intensity: 'High', market_potential_score: 8.9, is_fallback: true },
  { neighborhood_id: 3, city: 'Bangalore', neighborhood_name: 'HSR Layout', pincode: '560102', population: 180000, avg_household_income: 850000.0, working_professionals_pct: 75.0, price_sensitivity: 'Medium', competition_intensity: 'Medium', market_potential_score: 8.2, is_fallback: true },
  { neighborhood_id: 4, city: 'Delhi', neighborhood_name: 'Saket', pincode: '110017', population: 95000, avg_household_income: 890000.0, working_professionals_pct: 65.0, price_sensitivity: 'Medium', competition_intensity: 'Medium', market_potential_score: 9.0, is_fallback: true },
  { neighborhood_id: 5, city: 'Hyderabad', neighborhood_name: 'Gachibowli', pincode: '500032', population: 110000, avg_household_income: 1050000.0, working_professionals_pct: 78.0, price_sensitivity: 'Low', competition_intensity: 'Low', market_potential_score: 8.8, is_fallback: true },
];

export const FALLBACK_SIMULATOR_NEIGHBORHOODS = [
  { neighborhood_id: 1, neighborhood_name: 'Central Ward', pincode: '000001', centroid_lat: 12.9716, centroid_lng: 77.5946, population: 150000, avg_household_income: 950000.0, working_professionals_pct: 72.0, competition_intensity: 'High', is_fallback: true },
  { neighborhood_id: 2, neighborhood_name: 'North Market', pincode: '000002', centroid_lat: 12.9986, centroid_lng: 77.6386, population: 120000, avg_household_income: 1100000.0, working_professionals_pct: 68.0, competition_intensity: 'High', is_fallback: true },
  { neighborhood_id: 3, neighborhood_name: 'Transit Hub', pincode: '000003', centroid_lat: 12.9116, centroid_lng: 77.6446, population: 180000, avg_household_income: 850000.0, working_professionals_pct: 75.0, competition_intensity: 'Medium', is_fallback: true },
];
