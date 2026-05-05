import { useQuery } from '@tanstack/react-query';
import { Store, MapPin, TrendingUp, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  // Fetch store stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['store-stats'],
    queryFn: api.getStoreStats,
  });

  // Sample data for charts
  const orderTrends = [
    { date: 'Mon', orders: 4500 },
    { date: 'Tue', orders: 5200 },
    { date: 'Wed', orders: 4800 },
    { date: 'Thu', orders: 6100 },
    { date: 'Fri', orders: 7200 },
    { date: 'Sat', orders: 8500 },
    { date: 'Sun', orders: 7800 },
  ];

  const platformData = [
    { name: 'Blinkit', value: 2200, color: '#ff6b6b' },
    { name: 'Zepto', value: 1200, color: '#4ecdc4' },
    { name: 'Instamart', value: 800, color: '#ffd93d' },
    { name: 'Flipkart', value: 200, color: '#95e1d3' },
  ];

  const tierData = [
    { tier: 'Metro', stores: 3200 },
    { tier: 'Tier 1', stores: 800 },
    { tier: 'Tier 2', stores: 350 },
    { tier: 'Tier 3', stores: 50 },
  ];

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time insights into India's quick commerce landscape</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#667eea' }}>
            <Store size={24} />
          </div>
          <div className="kpi-content">
            <h3>Total Stores</h3>
            <p className="kpi-value">4,400+</p>
            <span className="kpi-change positive">+12% MoM</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#f093fb' }}>
            <MapPin size={24} />
          </div>
          <div className="kpi-content">
            <h3>Cities Covered</h3>
            <p className="kpi-value">130+</p>
            <span className="kpi-change positive">+8 this month</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#4facfe' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <h3>Daily Orders</h3>
            <p className="kpi-value">45,000+</p>
            <span className="kpi-change positive">+18% WoW</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fa709a' }}>
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <h3>Opportunity Zones</h3>
            <p className="kpi-value">340</p>
            <span className="kpi-change">High-pop, zero coverage</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Order Trends */}
        <div className="chart-card">
          <h3>Weekly Order Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={orderTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#667eea" 
                strokeWidth={2}
                dot={{ fill: '#667eea', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Distribution */}
        <div className="chart-card">
          <h3>Market Share by Platform</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* City Tier Distribution */}
        <div className="chart-card full-width">
          <h3>Store Distribution by City Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="stores" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Section */}
      <div className="insights-grid">
        <div className="insight-card info">
          <h4>📊 Coverage Gap Alert</h4>
          <p>78% of Indian PIN codes have zero quick commerce coverage, representing a massive untapped market opportunity.</p>
        </div>

        <div className="insight-card success">
          <h4>🚀 Tier-2 Growth</h4>
          <p>Tier-2 cities show 28% YoY growth in dark store deployment, but still remain significantly underserved.</p>
        </div>

        <div className="insight-card warning">
          <h4>⚡ Competition Intensity</h4>
          <p>Metro cities have 3-4 platforms competing, while Tier-2/3 cities often have single-platform monopolies.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
