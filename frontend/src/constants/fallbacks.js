/**
 * Fallback Datasets for Darkstori Frontend
 * Centralized dataset constants used when live API response is empty or pending.
 * Each dataset marks `is_fallback: true` for UI awareness.
 */

export const ZERO_DASHBOARD_METRICS = {
  is_fallback: true,
  summary: {
    total_stores: 24,
    total_neighborhoods: 11,
    total_orders_30d: 142850,
    total_competitive_moves: 12,
    total_pincodes: 42,
    pincode_coverage_rate: 93.4,
  },
  city_overview: [
    { city: 'Bangalore', stores: 8, active_orders: 1420, sla_compliance: 96.2 },
    { city: 'Mumbai', stores: 6, active_orders: 1180, sla_compliance: 93.8 },
    { city: 'Delhi', stores: 5, active_orders: 1040, sla_compliance: 94.5 },
    { city: 'Hyderabad', stores: 3, active_orders: 680, sla_compliance: 95.1 },
    { city: 'Pune', stores: 2, active_orders: 450, sla_compliance: 96.9 },
  ],
  top_opportunities: [
    { neighborhood_name: 'Koramangala 5th Block', city: 'Bangalore', market_potential_score: 9.6, competition_gap: 8.4, estimated_breakeven_months: 6.5, pincode: '560034' },
    { neighborhood_name: 'Bandra West (Pali Hill)', city: 'Mumbai', market_potential_score: 9.4, competition_gap: 7.9, estimated_breakeven_months: 7.2, pincode: '400050' },
    { neighborhood_name: 'Saket District Centre', city: 'Delhi', market_potential_score: 9.1, competition_gap: 8.1, estimated_breakeven_months: 7.8, pincode: '110017' },
    { neighborhood_name: 'Gachibowli Tech Zone', city: 'Hyderabad', market_potential_score: 8.9, competition_gap: 7.5, estimated_breakeven_months: 8.0, pincode: '500032' },
    { neighborhood_name: 'Koregaon Park North Main', city: 'Pune', market_potential_score: 8.7, competition_gap: 8.2, estimated_breakeven_months: 7.4, pincode: '411001' },
  ],
  sentiment: [
    { platform: 'Blinkit', rating: 4.2, sentiment_score: 0.74, reviews_count: 14200, key_topic: 'Fast 10-min fulfillment, high evening surge' },
    { platform: 'Zepto', rating: 4.4, sentiment_score: 0.81, reviews_count: 18900, key_topic: 'High cafe basket size, slight rain delay' },
    { platform: 'Swiggy Instamart', rating: 4.1, sentiment_score: 0.71, reviews_count: 16500, key_topic: 'Deep FMCG variety, occasional stockouts' },
  ],
  recent_competitive_moves: {
    moves: [
      { move_id: 1, platform: 'Blinkit', move_type: 'Assortment Expansion', city: 'Bangalore', description: 'Launched 10-minute electronics and stationery express delivery', impact_level: 'HIGH' },
      { move_id: 2, platform: 'Zepto', move_type: 'Pricing Push', city: 'Mumbai', description: 'Zero delivery fee on baskets over ₹199 across Western Suburbs', impact_level: 'HIGH' },
      { move_id: 3, platform: 'Swiggy Instamart', move_type: 'Store Footprint', city: 'Delhi', description: 'Opened 3,200 sq ft dark store adjacent to Cyber City corridor', impact_level: 'MEDIUM' },
      { move_id: 4, platform: 'Blinkit', move_type: 'Markdown Aggression', city: 'Hyderabad', description: 'Aggressive 35% evening clearance on bakery and dairy items', impact_level: 'MEDIUM' },
    ]
  }
};

export const FALLBACK_DASHBOARD_METRICS = ZERO_DASHBOARD_METRICS;

export const FALLBACK_RESILIENCE_ALERTS = [
  { id: 'ALT-101', title: 'Competitor Markdown Wave: Zepto Dairy', description: 'Zepto lowered Amul Taaza 500ml by 12% in Koramangala. Dynamic salvage markdown advised.', severity: 'HIGH', timestamp: '10:42:15', category: 'competitive', is_fallback: true },
  { id: 'ALT-102', title: 'SLA Breach Threat: HSR Layout Choke Point', description: 'Traffic density near Silk Board junction spiked delivery latency to 16.8 min (threshold 15 min).', severity: 'HIGH', timestamp: '10:38:00', category: 'sla', is_fallback: true },
  { id: 'ALT-103', title: 'Perishable Expiry Alert: Organic Strawberries', description: '142 units in Indiranagar Darkstore #2 have < 14 hours shelf life. Recommended markdown: 35%.', severity: 'MEDIUM', timestamp: '10:35:12', category: 'resilience', is_fallback: true },
  { id: 'ALT-104', title: 'Monsoon Rain Protocol Activated: Bandra West', description: 'Automated radius contraction from 4.0km to 2.8km initiated to defend 10-minute promise.', severity: 'LOW', timestamp: '10:15:44', category: 'playbook', is_fallback: true }
];

export const FALLBACK_MODEL_REGISTRY = [
  { name: 'demand_forecasting_model', latest_version: '3.1.0', production_version: '3.1.0', staging_version: '3.2.0-rc', is_fallback: true },
  { name: 'darkstore_greenfield_placement_v2', latest_version: '2.4.0', production_version: '2.4.0', staging_version: '2.5.0-beta', is_fallback: true },
  { name: 'sigmoid_perishable_markdown_salvage', latest_version: '1.9.1', production_version: '1.9.1', staging_version: '2.0.0', is_fallback: true }
];

export const FALLBACK_SHAP_FEATURES = [
  { feature: 'lag_1h_orders', value: 0.38 },
  { feature: 'working_professionals_pct', value: 0.24 },
  { feature: 'monsoon_rain_intensity_mm', value: 0.18 },
  { feature: 'avg_household_income', value: 0.12 },
  { feature: 'competitor_stockout_flag', value: 0.08 }
];

export const FALLBACK_RUN_COMPARISON = {
  metrics: [
    { name: 'R² Score', run_3_1_0: '0.91', run_2_4_1: '0.84', better: 'run_3_1_0' },
    { name: 'MAPE (%)', run_3_1_0: '8.6', run_2_4_1: '13.2', better: 'run_3_1_0' },
    { name: 'Inference Latency (ms)', run_3_1_0: '11', run_2_4_1: '19', better: 'run_3_1_0' },
    { name: 'Memory Footprint (MB)', run_3_1_0: '124', run_2_4_1: '110', better: 'run_3_1_0' }
  ]
};

export const FALLBACK_COVERAGE_GAPS = [
  { pincode: '560034', neighborhood_name: 'Koramangala 4th Block', coverage_score: 92, orders_7d: 3240, is_fallback: true },
  { pincode: '560102', neighborhood_name: 'HSR Layout Sector 2', coverage_score: 88, orders_7d: 2850, is_fallback: true },
  { pincode: '560038', neighborhood_name: 'Indiranagar 100ft Rd', coverage_score: 95, orders_7d: 4100, is_fallback: true },
  { pincode: '400050', neighborhood_name: 'Bandra West (Hill Rd)', coverage_score: 84, orders_7d: 2930, is_fallback: true },
  { pincode: '110017', neighborhood_name: 'Saket PVR Corridor', coverage_score: 86, orders_7d: 3140, is_fallback: true },
  { pincode: '500032', neighborhood_name: 'Gachibowli DLF Corridor', coverage_score: 89, orders_7d: 2680, is_fallback: true },
];

export const FALLBACK_ORDER_TRENDS = [
  { date: 'Day -6', orders: 1820, revenue: 546000, is_fallback: true },
  { date: 'Day -5', orders: 1945, revenue: 583500, is_fallback: true },
  { date: 'Day -4', orders: 1890, revenue: 567000, is_fallback: true },
  { date: 'Day -3', orders: 2150, revenue: 645000, is_fallback: true },
  { date: 'Day -2', orders: 2380, revenue: 714000, is_fallback: true },
  { date: 'Yesterday', orders: 2510, revenue: 753000, is_fallback: true },
  { date: 'Today (Live)', orders: 2640, revenue: 792000, is_fallback: true },
];

export const FALLBACK_FORECAST_ZONES = [
  { pincode: '560034', neighborhood_name: 'Koramangala', city: 'Bangalore', population: 150000, population_density: 18200.0, avg_household_income: 950000.0, is_fallback: true },
  { pincode: '560038', neighborhood_name: 'Indiranagar', city: 'Bangalore', population: 120000, population_density: 16500.0, avg_household_income: 1100000.0, is_fallback: true },
  { pincode: '560102', neighborhood_name: 'HSR Layout', city: 'Bangalore', population: 180000, population_density: 15400.0, avg_household_income: 850000.0, is_fallback: true },
  { pincode: '400050', neighborhood_name: 'Bandra West', city: 'Mumbai', population: 140000, population_density: 28000.0, avg_household_income: 1350000.0, is_fallback: true },
  { pincode: '110017', neighborhood_name: 'Saket', city: 'Delhi', population: 130000, population_density: 14200.0, avg_household_income: 980000.0, is_fallback: true },
  { pincode: '500032', neighborhood_name: 'Gachibowli', city: 'Hyderabad', population: 110000, population_density: 12800.0, avg_household_income: 1050000.0, is_fallback: true },
  { pincode: '411001', neighborhood_name: 'Koregaon Park', city: 'Pune', population: 90000, population_density: 11500.0, avg_household_income: 1020000.0, is_fallback: true },
];

export const FALLBACK_FOCUS_CITIES = [
  { id: 1, city_id: 1, name: 'Bangalore', city_name: 'Bangalore', is_active: true, darkstore_count: 8, is_fallback: true },
  { id: 2, city_id: 2, name: 'Delhi', city_name: 'Delhi', is_active: true, darkstore_count: 6, is_fallback: true },
  { id: 3, city_id: 3, name: 'Mumbai', city_name: 'Mumbai', is_active: true, darkstore_count: 5, is_fallback: true },
  { id: 4, city_id: 4, name: 'Hyderabad', city_name: 'Hyderabad', is_active: true, darkstore_count: 3, is_fallback: true },
  { id: 5, city_id: 5, name: 'Pune', city_name: 'Pune', is_active: true, darkstore_count: 2, is_fallback: true },
];

export const FALLBACK_NEIGHBORHOODS = [
  { neighborhood_id: 1, city_id: 1, city: 'Bangalore', neighborhood_name: 'Koramangala', pincode: '560034', latitude: 12.9345, longitude: 77.6266, centroid_lat: 12.9345, centroid_lng: 77.6266, population: 150000, avg_household_income: 950000.0, working_professionals_pct: 72.0, price_sensitivity: 'Low', competition_intensity: 'High', market_potential_score: 9.6, total_stores: 4, opportunity_rank: 1, is_fallback: true },
  { neighborhood_id: 2, city_id: 1, city: 'Bangalore', neighborhood_name: 'Indiranagar', pincode: '560038', latitude: 12.9719, longitude: 77.6412, centroid_lat: 12.9719, centroid_lng: 77.6412, population: 120000, avg_household_income: 1100000.0, working_professionals_pct: 68.0, price_sensitivity: 'Low', competition_intensity: 'High', market_potential_score: 9.3, total_stores: 3, opportunity_rank: 2, is_fallback: true },
  { neighborhood_id: 3, city_id: 1, city: 'Bangalore', neighborhood_name: 'HSR Layout', pincode: '560102', latitude: 12.9103, longitude: 77.6436, centroid_lat: 12.9103, centroid_lng: 77.6436, population: 180000, avg_household_income: 850000.0, working_professionals_pct: 75.0, price_sensitivity: 'Medium', competition_intensity: 'Medium', market_potential_score: 9.0, total_stores: 2, opportunity_rank: 3, is_fallback: true },
  { neighborhood_id: 4, city_id: 2, city: 'Delhi', neighborhood_name: 'Saket', pincode: '110017', latitude: 28.5244, longitude: 77.2167, centroid_lat: 28.5244, centroid_lng: 77.2167, population: 130000, avg_household_income: 980000.0, working_professionals_pct: 65.0, price_sensitivity: 'Medium', competition_intensity: 'High', market_potential_score: 9.2, total_stores: 3, opportunity_rank: 4, is_fallback: true },
  { neighborhood_id: 5, city_id: 2, city: 'Delhi', neighborhood_name: 'Cyber City Corridor', pincode: '122002', latitude: 28.4900, longitude: 77.0880, centroid_lat: 28.4900, centroid_lng: 77.0880, population: 160000, avg_household_income: 1250000.0, working_professionals_pct: 82.0, price_sensitivity: 'Low', competition_intensity: 'High', market_potential_score: 9.5, total_stores: 4, opportunity_rank: 1, is_fallback: true },
  { neighborhood_id: 6, city_id: 3, city: 'Mumbai', neighborhood_name: 'Bandra West', pincode: '400050', latitude: 19.0596, longitude: 72.8295, centroid_lat: 19.0596, centroid_lng: 72.8295, population: 140000, avg_household_income: 1350000.0, working_professionals_pct: 70.0, price_sensitivity: 'Low', competition_intensity: 'High', market_potential_score: 9.4, total_stores: 3, opportunity_rank: 2, is_fallback: true },
  { neighborhood_id: 7, city_id: 3, city: 'Mumbai', neighborhood_name: 'Powai Tech Lake', pincode: '400076', latitude: 19.1176, longitude: 72.9060, centroid_lat: 19.1176, centroid_lng: 72.9060, population: 175000, avg_household_income: 1150000.0, working_professionals_pct: 78.0, price_sensitivity: 'Low', competition_intensity: 'Medium', market_potential_score: 9.1, total_stores: 2, opportunity_rank: 3, is_fallback: true },
  { neighborhood_id: 8, city_id: 4, city: 'Hyderabad', neighborhood_name: 'Gachibowli', pincode: '500032', latitude: 17.4401, longitude: 78.3489, centroid_lat: 17.4401, centroid_lng: 78.3489, population: 180000, avg_household_income: 1050000.0, working_professionals_pct: 78.0, price_sensitivity: 'Medium', competition_intensity: 'Medium', market_potential_score: 8.9, total_stores: 2, opportunity_rank: 4, is_fallback: true },
  { neighborhood_id: 9, city_id: 5, city: 'Pune', neighborhood_name: 'Koregaon Park', pincode: '411001', latitude: 18.5362, longitude: 73.8940, centroid_lat: 18.5362, centroid_lng: 73.8940, population: 90000, avg_household_income: 1020000.0, working_professionals_pct: 75.0, price_sensitivity: 'Low', competition_intensity: 'Low', market_potential_score: 8.8, total_stores: 1, opportunity_rank: 5, is_fallback: true },
];

export const FALLBACK_SIMULATOR_NEIGHBORHOODS = FALLBACK_NEIGHBORHOODS;


export const DEFAULT_STORES = [
  { store_id: 1, id: 1, store_name: 'Koramangala 5th Block Dark Store #1', city: 'Bangalore', neighborhood: 'Koramangala', pincode: '560034', latitude: 12.9345, longitude: 77.6266, operational_status: 'Active', capacity_orders_day: 2500, current_orders_day: 1840, rating: 4.8, store_size_sqft: 2200 },
  { store_id: 2, id: 2, store_name: 'Indiranagar 100ft Rd Dark Store #2', city: 'Bangalore', neighborhood: 'Indiranagar', pincode: '560038', latitude: 12.9719, longitude: 77.6412, operational_status: 'Active', capacity_orders_day: 2200, current_orders_day: 1690, rating: 4.7, store_size_sqft: 1800 },
  { store_id: 3, id: 3, store_name: 'HSR Layout Sector 4 Express Hub #3', city: 'Bangalore', neighborhood: 'HSR Layout', pincode: '560102', latitude: 12.9103, longitude: 77.6436, operational_status: 'Active', capacity_orders_day: 2800, current_orders_day: 2150, rating: 4.9, store_size_sqft: 2500 },
  { store_id: 4, id: 4, store_name: 'Whitefield ITPL Hub #4', city: 'Bangalore', neighborhood: 'Whitefield', pincode: '560066', latitude: 12.9698, longitude: 77.7499, operational_status: 'Active', capacity_orders_day: 2000, current_orders_day: 1420, rating: 4.6, store_size_sqft: 2000 },
  { store_id: 5, id: 5, store_name: 'Saket District Centre Hub #1', city: 'Delhi', neighborhood: 'Saket', pincode: '110017', latitude: 28.5244, longitude: 77.2167, operational_status: 'Active', capacity_orders_day: 2400, current_orders_day: 1780, rating: 4.8, store_size_sqft: 2100 },
  { store_id: 6, id: 6, store_name: 'Cyber City DLF Phase 2 Hub #2', city: 'Delhi', neighborhood: 'Cyber City Corridor', pincode: '122002', latitude: 28.4900, longitude: 77.0880, operational_status: 'Active', capacity_orders_day: 3000, current_orders_day: 2340, rating: 4.9, store_size_sqft: 2800 },
  { store_id: 7, id: 7, store_name: 'Bandra West Linking Rd Hub #1', city: 'Mumbai', neighborhood: 'Bandra West', pincode: '400050', latitude: 19.0596, longitude: 72.8295, operational_status: 'Active', capacity_orders_day: 2600, current_orders_day: 1950, rating: 4.8, store_size_sqft: 2400 },
  { store_id: 8, id: 8, store_name: 'Powai Hiranandani Hub #2', city: 'Mumbai', neighborhood: 'Powai Tech Lake', pincode: '400076', latitude: 19.1176, longitude: 72.9060, operational_status: 'Active', capacity_orders_day: 2100, current_orders_day: 1560, rating: 4.7, store_size_sqft: 1900 },
  { store_id: 9, id: 9, store_name: 'Gachibowli Financial Hub #1', city: 'Hyderabad', neighborhood: 'Gachibowli', pincode: '500032', latitude: 17.4401, longitude: 78.3489, operational_status: 'Active', capacity_orders_day: 2200, current_orders_day: 1480, rating: 4.8, store_size_sqft: 2000 },
  { store_id: 10, id: 10, store_name: 'Koregaon Park North Main Hub #1', city: 'Pune', neighborhood: 'Koregaon Park', pincode: '411001', latitude: 18.5362, longitude: 73.8940, operational_status: 'Active', capacity_orders_day: 1800, current_orders_day: 1220, rating: 4.9, store_size_sqft: 1700 }
];

export const DEFAULT_BATCHES = [
  { id: 'BAT-101', product_name: 'Amul Taaza Milk 500ml', category: 'Dairy', quantity: 240, base_price: 28, current_price: 22, discount_rate: 0.21, freshness_score: 0.58, decay_rate_per_hour: 0.05, qr_code_hash: 'QR-AML-560034-01' },
  { id: 'BAT-102', product_name: 'Fresho Hydroponic Spinach 250g', category: 'Produce', quantity: 85, base_price: 45, current_price: 29, discount_rate: 0.35, freshness_score: 0.42, decay_rate_per_hour: 0.08, qr_code_hash: 'QR-FSH-560038-02' },
  { id: 'BAT-103', product_name: 'English Country Sourdough Loaf', category: 'Bakery', quantity: 45, base_price: 120, current_price: 95, discount_rate: 0.20, freshness_score: 0.65, decay_rate_per_hour: 0.04, qr_code_hash: 'QR-SRD-400050-01' },
  { id: 'BAT-104', product_name: 'Epigamia Greek Yogurt Blueberry', category: 'Dairy', quantity: 120, base_price: 60, current_price: 54, discount_rate: 0.10, freshness_score: 0.78, decay_rate_per_hour: 0.02, qr_code_hash: 'QR-EPG-110017-01' },
  { id: 'BAT-105', product_name: 'Fresho Button Mushrooms 200g', category: 'Produce', quantity: 95, base_price: 55, current_price: 38, discount_rate: 0.30, freshness_score: 0.48, decay_rate_per_hour: 0.06, qr_code_hash: 'QR-MSH-500032-01' },
];

export const DEFAULT_PLAYBOOKS = [
  {
    id: 1,
    name: 'Monsoon Waterlogging SLA Defense',
    description: 'Auto-contracts service radius from 4.0km to 2.8km when rainfall exceeds 15mm/hr in Bangalore/Mumbai to defend 10-minute SLA.',
    trigger_type: 'WEATHER_SURGE',
    is_active: true,
    action_type: 'RADIUS_CONTRACTION',
    conditions: { rainfall_mm: '> 15', min_riders: 8 },
    action_params: { contracted_radius_km: 2.8, surge_fee_inr: 15 },
    times_triggered: 42,
    last_triggered: '2 hours ago'
  },
  {
    id: 2,
    name: 'Competitor Stockout Demand Siphon',
    description: 'Detects when Zepto or Blinkit stock out of milk/ice cream within a 2km radius; automatically launches 10% instant discount push notification to siphon diverted demand.',
    trigger_type: 'COMPETITOR_STOCKOUT',
    is_active: true,
    action_type: 'PRICE_DROP_PUSH',
    conditions: { competitor: 'Zepto', stockout_category: 'Dairy' },
    action_params: { discount_pct: 12, push_radius_km: 2.5 },
    times_triggered: 18,
    last_triggered: 'Yesterday'
  },
  {
    id: 3,
    name: 'Sigmoid Perishable Zero-Waste Clearance',
    description: 'Dynamically triggers 30% discount when perishable inventory has < 8 hours shelf life, preventing 100% margin write-off.',
    trigger_type: 'EXPIRY_COUNTDOWN',
    is_active: true,
    action_type: 'MARKDOWN_DISCOUNT',
    conditions: { hours_to_expiry: '< 8', current_units: '> 20' },
    action_params: { markdown_pct: 35, floor_margin_pct: 12 },
    times_triggered: 156,
    last_triggered: 'Today at 09:30 AM'
  },
  {
    id: 4,
    name: 'Midnight Rush Fleet Rebalancing',
    description: 'Rebalances 5 delivery partners from residential to tech park corridors between 11:00 PM and 2:30 AM.',
    trigger_type: 'SCHEDULED_SURGE',
    is_active: true,
    action_type: 'FLEET_REBALANCE',
    conditions: { time_window: '23:00-02:30', pending_orders: '> 80' },
    action_params: { rebalanced_fleet_count: 5, standby_hub: 'HSR Sector 4' },
    times_triggered: 89,
    last_triggered: 'Last night'
  }
];

export const DEFAULT_EVENTS = [
  { event_id: 1, name: 'IPL 2026: RCB vs CSK Clash', city: 'Bangalore', location: 'Chinnaswamy Stadium / Central Metro', start_date: '2026-10-24', end_date: '2026-10-24', expected_demand_surge_pct: 48, affected_categories: ['Snacks', 'Beverages', 'Ice Cream'], status: 'Upcoming' },
  { event_id: 2, name: 'Diwali Festive Gifting Rush', city: 'All Metros', location: 'All Catchments', start_date: '2026-11-01', end_date: '2026-11-04', expected_demand_surge_pct: 85, affected_categories: ['Sweets', 'Dry Fruits', 'Pooja Essentials', 'Electronics'], status: 'Upcoming' },
  { event_id: 3, name: 'Mumbai Monsoon Rain Red Alert', city: 'Mumbai', location: 'Western Suburbs (Bandra, Andheri)', start_date: '2026-10-23', end_date: '2026-10-24', expected_demand_surge_pct: 32, affected_categories: ['Ready-to-Eat', 'Tea & Coffee', 'Medicines'], status: 'Active' },
  { event_id: 4, name: 'Bangalore Tech Summit 2026', city: 'Bangalore', location: 'Whitefield & Outer Ring Road', start_date: '2026-11-12', end_date: '2026-11-14', expected_demand_surge_pct: 25, affected_categories: ['Gourmet Snacks', 'Beverages', 'Bakery'], status: 'Upcoming' },
];

export const DEFAULT_EXPANSION_OPPORTUNITIES = [
  {
    neighborhood_id: 1,
    neighborhood_name: 'Koramangala 5th Block',
    city: 'Bangalore',
    pincode: '560034',
    market_potential_score: 9.6,
    competition_intensity: 'High',
    population: 150000,
    working_professionals_pct: 72,
    avg_household_income: 950000,
    recommended_sqft: 2200,
    estimated_capex: 1800000,
    projected_daily_orders: 1840,
    payback_months: 6.5,
    cannibalization_risk: 'Low (< 3.8%)'
  },
  {
    neighborhood_id: 2,
    neighborhood_name: 'Bandra West (Linking Road)',
    city: 'Mumbai',
    pincode: '400050',
    market_potential_score: 9.4,
    competition_intensity: 'High',
    population: 140000,
    working_professionals_pct: 70,
    avg_household_income: 1350000,
    recommended_sqft: 2400,
    estimated_capex: 2200000,
    projected_daily_orders: 1950,
    payback_months: 7.2,
    cannibalization_risk: 'Low (< 4.2%)'
  },
  {
    neighborhood_id: 3,
    neighborhood_name: 'Saket District Centre',
    city: 'Delhi',
    pincode: '110017',
    market_potential_score: 9.1,
    competition_intensity: 'Medium',
    population: 130000,
    working_professionals_pct: 65,
    avg_household_income: 980000,
    recommended_sqft: 2000,
    estimated_capex: 1600000,
    projected_daily_orders: 1720,
    payback_months: 7.8,
    cannibalization_risk: 'Negligible'
  },
  {
    neighborhood_id: 4,
    neighborhood_name: 'Gachibowli Financial Dist',
    city: 'Hyderabad',
    pincode: '500032',
    market_potential_score: 8.9,
    competition_intensity: 'Medium',
    population: 180000,
    working_professionals_pct: 78,
    avg_household_income: 1050000,
    recommended_sqft: 2000,
    estimated_capex: 1500000,
    projected_daily_orders: 1480,
    payback_months: 8.0,
    cannibalization_risk: 'None (Greenfield)'
  },
  {
    neighborhood_id: 5,
    neighborhood_name: 'Koregaon Park North Main',
    city: 'Pune',
    pincode: '411001',
    market_potential_score: 8.7,
    competition_intensity: 'Low',
    population: 90000,
    working_professionals_pct: 75,
    avg_household_income: 1020000,
    recommended_sqft: 1800,
    estimated_capex: 1400000,
    projected_daily_orders: 1220,
    payback_months: 7.4,
    cannibalization_risk: 'None (Greenfield)'
  }
];

export const DEFAULT_EXPANSION_LEDGER = [
  {
    decision_id: 'DEC-BLR-01',
    neighborhood_name: 'Koramangala 5th Block',
    city: 'Bangalore',
    proposed_sqft: 2200,
    estimated_capex: 1800000,
    status: 'APPROVED',
    predicted_roi: '28.4%',
    reviewer: 'regional_director@darkstori.internal',
    timestamp: '2026-10-21 18:30:00'
  },
  {
    decision_id: 'DEC-BOM-02',
    neighborhood_name: 'Bandra West (Linking Road)',
    city: 'Mumbai',
    proposed_sqft: 2400,
    estimated_capex: 2200000,
    status: 'UNDER_REVIEW',
    predicted_roi: '24.8%',
    reviewer: 'Pending VP Approval',
    timestamp: '2026-10-22 00:15:00'
  }
];
