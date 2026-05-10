# 🚀 Quick Start: Live Delivery Feed

## Overview

This guide will help you set up and test the live delivery feed system in under 30 minutes.

---

## Prerequisites

- Backend server running (see main README)
- Python 3.11+
- API keys configured in `.env`

---

## Step 1: Install Additional Dependencies

```bash
# Navigate to backend
cd backend

# Install required packages
pip install aiohttp beautifulsoup4 tweepy
```

---

## Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Twitter API (Optional - for sentiment analysis)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret

# Google Maps API (Already configured)
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Live Feed Settings
LIVE_FEED_ENABLED=true
LIVE_FEED_UPDATE_INTERVAL=300  # 5 minutes
LIVE_FEED_RETENTION_HOURS=24
```

---

## Step 3: Test the Live Feed

### Option A: Using Python Script

```bash
# Test the live feed module
python backend/data_sources/live_delivery_feed.py
```

Expected output:
```
=== Live Delivery Metrics ===
total_deliveries_last_hour: 150
avg_delivery_time: 13.5
platform_breakdown: {'blinkit': 65, 'zepto': 45, 'instamart': 30, 'dunzo': 10}
busiest_pincodes: {'110001': 25, '400001': 20, ...}
last_updated: 2026-05-10T14:30:00
```

### Option B: Using API Endpoints

1. **Start the backend server**:
```bash
cd backend
uvicorn app:app --reload
```

2. **Test API endpoints**:

```bash
# Check platform availability
curl -X GET "http://localhost:8000/api/v1/live-feed/availability/110001" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get delivery time estimates
curl -X GET "http://localhost:8000/api/v1/live-feed/delivery-times/110001" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get live metrics
curl -X GET "http://localhost:8000/api/v1/live-feed/metrics/live" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get daily report
curl -X GET "http://localhost:8000/api/v1/live-feed/report/daily" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Step 4: Register Live Feed Routes

Add to `backend/app.py`:

```python
from backend.api.routes import live_feed

# Register live feed routes
app.include_router(live_feed.router)
```

---

## Step 5: Simulate Live Data (For Testing)

```python
import asyncio
from backend.data_sources.live_delivery_feed import simulate_live_feed

# Run simulation for 5 minutes
asyncio.run(simulate_live_feed(duration_minutes=5))
```

---

## Step 6: View Live Dashboard

1. Navigate to frontend:
```bash
cd frontend
npm run dev
```

2. Open browser: `http://localhost:5173`

3. Go to **Live Feed** section (to be implemented in frontend)

---

## API Endpoints Reference

### 1. Check Platform Availability
```http
GET /api/v1/live-feed/availability/{pincode}
```

**Response**:
```json
{
  "pincode": "110001",
  "timestamp": "2026-05-10T14:30:00",
  "platforms": {
    "blinkit": true,
    "zepto": true,
    "instamart": true,
    "dunzo": false
  },
  "available_count": 3
}
```

### 2. Get Delivery Time Estimates
```http
GET /api/v1/live-feed/delivery-times/{pincode}
```

**Response**:
```json
{
  "pincode": "110001",
  "timestamp": "2026-05-10T14:30:00",
  "delivery_times": {
    "blinkit": 12,
    "zepto": 10,
    "instamart": 15,
    "dunzo": null
  },
  "fastest_platform": "zepto",
  "fastest_time": 10
}
```

### 3. Get Live Metrics
```http
GET /api/v1/live-feed/metrics/live
```

**Response**:
```json
{
  "status": "active",
  "metrics": {
    "total_deliveries_last_hour": 150,
    "avg_delivery_time": 13.5,
    "platform_breakdown": {
      "blinkit": 65,
      "zepto": 45,
      "instamart": 30,
      "dunzo": 10
    },
    "busiest_pincodes": {
      "110001": 25,
      "400001": 20
    },
    "last_updated": "2026-05-10T14:30:00"
  },
  "timestamp": "2026-05-10T14:30:00"
}
```

### 4. Get Daily Report
```http
GET /api/v1/live-feed/report/daily?report_date=2026-05-10
```

**Response**:
```json
{
  "status": "success",
  "report": {
    "date": "2026-05-10",
    "total_deliveries": 3450,
    "platforms": {
      "blinkit": {
        "deliveries": 1450,
        "avg_time": 12.5,
        "market_share": 42.0
      },
      "zepto": {
        "deliveries": 1070,
        "avg_time": 11.2,
        "market_share": 31.0
      }
    },
    "peak_hours": {
      "8": 120,
      "12": 180,
      "20": 280
    },
    "top_pincodes": {
      "110001": 150,
      "400001": 130
    },
    "insights": [
      "✅ Excellent delivery times (12.3 mins)",
      "📊 Blinkit leads with 42.0% market share",
      "⏰ Peak delivery hour: 20:00"
    ]
  }
}
```

### 5. Get Platform Sentiment
```http
GET /api/v1/live-feed/sentiment/{platform}
```

**Response**:
```json
{
  "platform": "blinkit",
  "timestamp": "2026-05-10T14:30:00",
  "sentiment": {
    "sentiment_score": 0.7,
    "mention_count": 150,
    "complaint_count": 12,
    "praise_count": 45,
    "trending_issues": ["delayed delivery", "missing items"]
  }
}
```

### 6. Log Delivery Event (Crowdsourcing)
```http
POST /api/v1/live-feed/event
Content-Type: application/json

{
  "platform": "blinkit",
  "pincode": "110001",
  "delivery_time": 12,
  "order_value": 450,
  "items_count": 8,
  "success": true
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Delivery event logged successfully",
  "timestamp": "2026-05-10T14:30:00"
}
```

---

## Integration with Frontend

### Example React Component

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function LiveFeedDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get(
          'http://localhost:8000/api/v1/live-feed/metrics/live',
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setMetrics(response.data.metrics);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="live-feed-dashboard">
      <h2>Live Delivery Metrics</h2>
      
      <div className="metric-card">
        <h3>Deliveries (Last Hour)</h3>
        <p className="metric-value">
          {metrics?.total_deliveries_last_hour || 0}
        </p>
      </div>

      <div className="metric-card">
        <h3>Average Delivery Time</h3>
        <p className="metric-value">
          {metrics?.avg_delivery_time?.toFixed(1) || 0} mins
        </p>
      </div>

      <div className="platform-breakdown">
        <h3>Platform Breakdown</h3>
        {Object.entries(metrics?.platform_breakdown || {}).map(([platform, count]) => (
          <div key={platform} className="platform-item">
            <span>{platform}</span>
            <span>{count} deliveries</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveFeedDashboard;
```

---

## Troubleshooting

### Issue: No data in live feed

**Solution**: Run the simulation script to generate test data:
```python
python backend/data_sources/live_delivery_feed.py
```

### Issue: API returns 401 Unauthorized

**Solution**: Ensure you have a valid JWT token:
```bash
# Login first
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "password123"}'
```

### Issue: Twitter API not working

**Solution**: Twitter API is optional. The system will work without it, but sentiment analysis will return placeholder data.

---

## Next Steps

1. **Implement real web scraping** for actual platform data
2. **Set up Twitter API** for sentiment analysis
3. **Build frontend dashboard** for live metrics
4. **Create scheduled jobs** for daily reports
5. **Set up email notifications** for daily briefings

---

## Production Deployment

### Enable Live Feed in Production

1. Set environment variables:
```env
LIVE_FEED_ENABLED=true
LIVE_FEED_UPDATE_INTERVAL=300
```

2. Set up background worker:
```python
# backend/workers/live_feed_worker.py
import asyncio
from backend.data_sources.live_delivery_feed import live_feed

async def update_live_feed():
    while True:
        # Fetch data from all sources
        await live_feed.fetch_all_platforms()
        
        # Wait for next update
        await asyncio.sleep(300)  # 5 minutes

if __name__ == "__main__":
    asyncio.run(update_live_feed())
```

3. Run worker as separate process:
```bash
python backend/workers/live_feed_worker.py &
```

---

## Support

For issues or questions:
- **GitHub Issues**: [Create an issue](https://github.com/AadityaUniyal/Darkstori/issues)
- **Email**: aaditya.uniyal22@gmail.com

---

**Last Updated**: May 10, 2026
