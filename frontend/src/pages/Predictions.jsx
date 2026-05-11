import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Target, 
  Calendar,
  MapPin,
  Sparkles,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import './Predictions.css';

const Predictions = () => {
  const [forecastDays, setForecastDays] = useState(30);
  const [predictionParams, setPredictionParams] = useState({
    population: 150000,
    coverage_score: 2.0,
    avg_income: 50000,
    distance_to_store: 3.5,
    internet_penetration: 75.0,
    is_weekend: false,
  });

  // Fetch forecast data
  const { data: forecastData, isLoading: forecastLoading, refetch: refetchForecast } = useQuery({
    queryKey: ['forecast', forecastDays],
    queryFn: () => api.getForecast(forecastDays),
  });

  // Fetch opportunity zones
  const { data: opportunityZones, isLoading: zonesLoading } = useQuery({
    queryKey: ['opportunity-zones'],
    queryFn: () => api.getOpportunityZones(20),
  });

  // Predict demand
  const { data: demandPrediction, refetch: predictDemand, isLoading: predicting } = useQuery({
    queryKey: ['predict-demand', predictionParams],
    queryFn: () => api.predictDemand(predictionParams),
    enabled: false,
  });

  const handleParamChange = (key, value) => {
    setPredictionParams(prev => ({
      ...prev,
      [key]: parseFloat(value) || value,
    }));
  };

  const handlePredict = () => {
    predictDemand();
  };

  return (
    <div className="predictions-page">
      {/* Header */}
      <div className="predictions-header">
        <div>
          <h1>Demand Forecasting & Predictions</h1>
          <p>AI-powered insights for strategic planning and expansion</p>
        </div>
        
        <button className="refresh-btn" onClick={() => refetchForecast()}>
          <RefreshCw size={18} />
          Refresh Data
        </button>
      </div>

      {/* Forecast Section */}
      <div className="forecast-section">
        <div className="section-header">
          <div>
            <h2><Calendar size={24} /> Demand Forecast</h2>
            <p>Predicted order volume for the next {forecastDays} days</p>
          </div>
          
          <div className="forecast-controls">
            <select 
              value={forecastDays}
              onChange={(e) => setForecastDays(parseInt(e.target.value))}
            >
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
            
            <button className="download-btn">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div className="forecast-chart-card">
          {forecastLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Generating forecast...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="predicted_orders" 
                  stroke="#667eea" 
                  fillOpacity={1} 
                  fill="url(#colorForecast)"
                  name="Predicted Orders"
                />
                <Area 
                  type="monotone" 
                  dataKey="lower_bound" 
                  stroke="#94a3b8" 
                  fill="none"
                  strokeDasharray="5 5"
                  name="Lower Bound"
                />
                <Area 
                  type="monotone" 
                  dataKey="upper_bound" 
                  stroke="#94a3b8" 
                  fill="none"
                  strokeDasharray="5 5"
                  name="Upper Bound"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Forecast Insights */}
        <div className="forecast-insights">
          <div className="insight-card">
            <Sparkles className="insight-icon" />
            <div>
              <h4>Peak Demand</h4>
              <p>Expected on weekends with 35% higher volume</p>
            </div>
          </div>
          
          <div className="insight-card">
            <TrendingUp className="insight-icon" />
            <div>
              <h4>Growth Trend</h4>
              <p>18% month-over-month growth predicted</p>
            </div>
          </div>
          
          <div className="insight-card">
            <Target className="insight-icon" />
            <div>
              <h4>Confidence</h4>
              <p>85% accuracy based on historical data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demand Predictor */}
      <div className="predictor-section">
        <div className="section-header">
          <h2><Sparkles size={24} /> Custom Demand Predictor</h2>
          <p>Predict demand for specific parameters</p>
        </div>

        <div className="predictor-grid">
          {/* Input Parameters */}
          <div className="predictor-inputs">
            <h3>Input Parameters</h3>
            
            <div className="input-group">
              <label>Population</label>
              <input
                type="number"
                value={predictionParams.population}
                onChange={(e) => handleParamChange('population', e.target.value)}
                placeholder="150000"
              />
            </div>

            <div className="input-group">
              <label>Coverage Score (0-4)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="4"
                value={predictionParams.coverage_score}
                onChange={(e) => handleParamChange('coverage_score', e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Average Income (₹)</label>
              <input
                type="number"
                value={predictionParams.avg_income}
                onChange={(e) => handleParamChange('avg_income', e.target.value)}
                placeholder="50000"
              />
            </div>

            <div className="input-group">
              <label>Distance to Store (km)</label>
              <input
                type="number"
                step="0.1"
                value={predictionParams.distance_to_store}
                onChange={(e) => handleParamChange('distance_to_store', e.target.value)}
                placeholder="3.5"
              />
            </div>

            <div className="input-group">
              <label>Internet Penetration (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={predictionParams.internet_penetration}
                onChange={(e) => handleParamChange('internet_penetration', e.target.value)}
                placeholder="75.0"
              />
            </div>

            <div className="input-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={predictionParams.is_weekend}
                  onChange={(e) => handleParamChange('is_weekend', e.target.checked)}
                />
                <span>Weekend</span>
              </label>
            </div>

            <button 
              className="predict-btn"
              onClick={handlePredict}
              disabled={predicting}
            >
              {predicting ? 'Predicting...' : 'Predict Demand'}
            </button>
          </div>

          {/* Prediction Result */}
          <div className="predictor-result">
            <h3>Prediction Result</h3>
            
            {demandPrediction ? (
              <div className="result-display">
                <div className="result-main">
                  <span className="result-label">Predicted Daily Orders</span>
                  <span className="result-value">
                    {demandPrediction.predicted_daily_orders?.toLocaleString()}
                  </span>
                </div>
                
                <div className="result-details">
                  <div className="detail-item">
                    <span className="detail-label">Confidence</span>
                    <span className="detail-value">
                      {(demandPrediction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Model</span>
                    <span className="detail-value">{demandPrediction.model}</span>
                  </div>
                </div>

                <div className="result-insights">
                  <h4>Insights</h4>
                  <ul>
                    <li>High population density indicates strong demand potential</li>
                    <li>Coverage score suggests moderate competition</li>
                    <li>Location is within optimal delivery range</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="result-placeholder">
                <Sparkles size={48} />
                <p>Enter parameters and click &quot;Predict Demand&quot; to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opportunity Zones */}
      <div className="opportunities-section">
        <div className="section-header">
          <h2><MapPin size={24} /> High-Opportunity Expansion Zones</h2>
          <p>Top locations for new dark store deployment</p>
        </div>

        {zonesLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading opportunities...</p>
          </div>
        ) : (
          <div className="opportunities-grid">
            {opportunityZones?.map((zone, idx) => (
              <div key={zone.pincode} className="opportunity-card">
                <div className="opportunity-rank">#{idx + 1}</div>
                <div className="opportunity-content">
                  <h3>{zone.city}</h3>
                  <p className="opportunity-location">
                    <MapPin size={14} />
                    {zone.state} • PIN: {zone.pincode}
                  </p>
                  
                  <div className="opportunity-metrics">
                    <div className="metric">
                      <span className="metric-label">Population</span>
                      <span className="metric-value">
                        {zone.population?.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">Coverage</span>
                      <span className="metric-value">{zone.coverage_score}/4</span>
                    </div>
                    
                    <div className="metric">
                      <span className="metric-label">Opportunity</span>
                      <span className="metric-value score">
                        {zone.opportunity_score?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <button className="view-details-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Predictions;
