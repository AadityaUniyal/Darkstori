import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './LiveFeed.css';

function LiveFeed() {
  const [metrics, setMetrics] = useState(null);
  const [deliveryTimes, setDeliveryTimes] = useState(null);
  const [pincode, setPincode] = useState('110001');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchLiveMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/live-feed/metrics/live`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setMetrics(response.data.metrics);
      setError(null);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to fetch live metrics');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchLiveMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [fetchLiveMetrics]);

  const fetchDeliveryTimes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/live-feed/delivery-times/${pincode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDeliveryTimes(response.data);
    } catch (err) {
      console.error('Error fetching delivery times:', err);
    }
  };

  const handlePincodeSubmit = (e) => {
    e.preventDefault();
    fetchDeliveryTimes();
  };

  if (loading) {
    return (
      <div className="live-feed-container">
        <div className="loading">Loading live feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-feed-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="live-feed-container">
      <div className="live-feed-header">
        <h1>📡 Live Delivery Feed</h1>
        <p className="subtitle">Real-time delivery tracking across all platforms</p>
        <div className="last-updated">
          Last updated: {metrics?.last_updated ? new Date(metrics.last_updated).toLocaleTimeString() : 'N/A'}
        </div>
      </div>

      {/* Live Metrics Dashboard */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <h3>Deliveries (Last Hour)</h3>
            <p className="metric-value">{metrics?.total_deliveries_last_hour || 0}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Average Delivery Time</h3>
            <p className="metric-value">
              {metrics?.avg_delivery_time ? `${metrics.avg_delivery_time.toFixed(1)} mins` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🏆</div>
          <div className="metric-content">
            <h3>Leading Platform</h3>
            <p className="metric-value">
              {metrics?.platform_breakdown ? 
                Object.entries(metrics.platform_breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {metrics?.platform_breakdown && (
        <div className="section">
          <h2>Platform Breakdown</h2>
          <div className="platform-list">
            {Object.entries(metrics.platform_breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([platform, count]) => {
                const total = Object.values(metrics.platform_breakdown).reduce((a, b) => a + b, 0);
                const percentage = ((count / total) * 100).toFixed(1);
                
                return (
                  <div key={platform} className="platform-item">
                    <div className="platform-info">
                      <span className="platform-name">{platform}</span>
                      <span className="platform-count">{count} deliveries</span>
                    </div>
                    <div className="platform-bar">
                      <div 
                        className="platform-bar-fill" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="platform-percentage">{percentage}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Delivery Time Estimator */}
      <div className="section">
        <h2>Delivery Time Estimator</h2>
        <form onSubmit={handlePincodeSubmit} className="pincode-form">
          <input
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="Enter PIN code"
            maxLength="6"
            pattern="[0-9]{6}"
            required
          />
          <button type="submit">Check Delivery Times</button>
        </form>

        {deliveryTimes && (
          <div className="delivery-times">
            <h3>Estimated Delivery Times for {deliveryTimes.pincode}</h3>
            <div className="delivery-times-grid">
              {Object.entries(deliveryTimes.delivery_times).map(([platform, time]) => (
                <div 
                  key={platform} 
                  className={`delivery-time-card ${time === null ? 'unavailable' : ''} ${platform === deliveryTimes.fastest_platform ? 'fastest' : ''}`}
                >
                  <div className="platform-name">{platform}</div>
                  <div className="delivery-time">
                    {time !== null ? `${time} mins` : 'Not Available'}
                  </div>
                  {platform === deliveryTimes.fastest_platform && (
                    <div className="fastest-badge">⚡ Fastest</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Busiest PIN Codes */}
      {metrics?.busiest_pincodes && Object.keys(metrics.busiest_pincodes).length > 0 && (
        <div className="section">
          <h2>Busiest PIN Codes</h2>
          <div className="pincode-list">
            {Object.entries(metrics.busiest_pincodes)
              .slice(0, 10)
              .map(([pincode, count], index) => (
                <div key={pincode} className="pincode-item">
                  <span className="pincode-rank">#{index + 1}</span>
                  <span className="pincode-code">{pincode}</span>
                  <span className="pincode-count">{count} deliveries</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="status-indicator">
        <div className="status-dot active"></div>
        <span>Live Feed Active</span>
      </div>
    </div>
  );
}

export default LiveFeed;
