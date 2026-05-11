import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import './Analytics.css';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Fetch analytics data
  const { data: coverageByTier } = useQuery({
    queryKey: ['coverage-by-tier'],
    queryFn: api.getCoverageByTier,
  });

  const { data: orderTrends } = useQuery({
    queryKey: ['order-trends', timeRange, selectedPlatform],
    queryFn: () => api.getOrderTrends({
      days: parseInt(timeRange),
      platform: selectedPlatform !== 'all' ? selectedPlatform : undefined,
    }),
  });

  const { data: platformComparison } = useQuery({
    queryKey: ['platform-comparison'],
    queryFn: api.getPlatformComparison,
  });

  const { data: coverageGaps } = useQuery({
    queryKey: ['coverage-gaps'],
    queryFn: () => api.getCoverageGaps({ limit: 10 }),
  });

  // Sample data for additional charts
  const hourlyData = [
    { hour: '00:00', orders: 120 },
    { hour: '03:00', orders: 80 },
    { hour: '06:00', orders: 200 },
    { hour: '09:00', orders: 450 },
    { hour: '12:00', orders: 800 },
    { hour: '15:00', orders: 600 },
    { hour: '18:00', orders: 950 },
    { hour: '21:00', orders: 700 },
  ];

  const categoryData = [
    { name: 'Grocery', value: 45, color: '#667eea' },
    { name: 'Electronics', value: 20, color: '#4ecdc4' },
    { name: 'Beauty', value: 18, color: '#ffd93d' },
    { name: 'Pharma', value: 12, color: '#ff6b6b' },
    { name: 'Others', value: 5, color: '#95e1d3' },
  ];

  const growthData = [
    { month: 'Jan', growth: 12 },
    { month: 'Feb', growth: 18 },
    { month: 'Mar', growth: 15 },
    { month: 'Apr', growth: 28 },
    { month: 'May', growth: 35 },
    { month: 'Jun', growth: 42 },
  ];

  const handleExport = () => {
    // Export functionality
    // eslint-disable-next-line no-console
    console.log('Exporting analytics data...');
  };

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1>Advanced Analytics</h1>
          <p>Deep insights into market trends and performance metrics</p>
        </div>
        
        <div className="header-actions">
          <div className="filter-group">
            <Calendar size={18} />
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          <div className="filter-group">
            <Filter size={18} />
            <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
              <option value="all">All Platforms</option>
              <option value="Blinkit">Blinkit</option>
              <option value="Zepto">Zepto</option>
              <option value="Instamart">Instamart</option>
            </select>
          </div>
          
          <button className="export-btn" onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="kpi-summary">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#667eea' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Total Orders</span>
            <span className="kpi-value">1.2M</span>
            <span className="kpi-change positive">
              <TrendingUp size={14} /> +18.2%
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#4ecdc4' }}>
            <BarChart3 size={24} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Avg Order Value</span>
            <span className="kpi-value">₹487</span>
            <span className="kpi-change positive">
              <TrendingUp size={14} /> +5.3%
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#ffd93d' }}>
            <PieChartIcon size={24} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Market Share</span>
            <span className="kpi-value">32%</span>
            <span className="kpi-change negative">
              <TrendingDown size={14} /> -2.1%
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#ff6b6b' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">Growth Rate</span>
            <span className="kpi-value">42%</span>
            <span className="kpi-change positive">
              <TrendingUp size={14} /> +12.5%
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid">
        {/* Order Trends */}
        <div className="chart-card large">
          <h3>Order Trends Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={orderTrends?.trends || []}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="order_count" 
                stroke="#667eea" 
                fillOpacity={1} 
                fill="url(#colorOrders)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="chart-card">
          <h3>Order Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Pattern */}
        <div className="chart-card large">
          <h3>Hourly Order Pattern</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Comparison */}
        <div className="chart-card">
          <h3>Platform Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformComparison?.comparison || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="platform" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_orders" fill="#667eea" />
              <Bar dataKey="avg_order_value" fill="#4ecdc4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Trend */}
        <div className="chart-card">
          <h3>Month-over-Month Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="growth" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Coverage by Tier */}
        <div className="chart-card">
          <h3>Coverage by City Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coverageByTier?.by_tier || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_pincodes" fill="#667eea" name="PIN Codes" />
              <Bar dataKey="avg_coverage" fill="#ffd93d" name="Avg Coverage" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Opportunities Table */}
      <div className="opportunities-section">
        <h2>Top Coverage Gap Opportunities</h2>
        <div className="table-container">
          <table className="opportunities-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>City</th>
                <th>PIN Code</th>
                <th>State</th>
                <th>Population</th>
                <th>Coverage Score</th>
                <th>Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {coverageGaps?.opportunities?.map((gap, idx) => (
                <tr key={gap.pincode}>
                  <td>{idx + 1}</td>
                  <td>{gap.city}</td>
                  <td>{gap.pincode}</td>
                  <td>{gap.state}</td>
                  <td>{gap.population?.toLocaleString()}</td>
                  <td>
                    <span className="coverage-badge" data-score={gap.coverage_score}>
                      {gap.coverage_score}/4
                    </span>
                  </td>
                  <td>
                    <span className="opportunity-badge high">High</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
