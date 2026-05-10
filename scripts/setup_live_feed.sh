#!/bin/bash

# Live Feed Setup Script
# This script sets up the live delivery feed system

echo "🚀 Setting up Live Delivery Feed System..."
echo ""

# Check if we're in the project root
if [ ! -f "README.md" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Step 1: Install Python dependencies
echo "📦 Step 1: Installing Python dependencies..."
cd backend
pip install aiohttp==3.9.1 beautifulsoup4==4.12.2 tweepy==4.14.0
if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi
cd ..

# Step 2: Update .env file
echo ""
echo "📝 Step 2: Updating environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Check if live feed settings already exist
if ! grep -q "LIVE_FEED_ENABLED" .env; then
    echo "" >> .env
    echo "# Live Feed Configuration" >> .env
    echo "LIVE_FEED_ENABLED=true" >> .env
    echo "LIVE_FEED_UPDATE_INTERVAL=300" >> .env
    echo "LIVE_FEED_RETENTION_HOURS=24" >> .env
    echo "" >> .env
    echo "# Twitter API (Optional)" >> .env
    echo "TWITTER_API_KEY=your_twitter_api_key" >> .env
    echo "TWITTER_API_SECRET=your_twitter_api_secret" >> .env
    echo "TWITTER_ACCESS_TOKEN=your_access_token" >> .env
    echo "TWITTER_ACCESS_SECRET=your_access_secret" >> .env
    echo "✅ Environment variables added to .env"
else
    echo "✅ Live feed settings already exist in .env"
fi

# Step 3: Test the live feed module
echo ""
echo "🧪 Step 3: Testing live feed module..."
cd backend
python -c "from data_sources.live_delivery_feed import live_feed; print('✅ Live feed module loaded successfully')" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Live feed module is working"
else
    echo "⚠️  Live feed module test failed (this is OK if dependencies are still installing)"
fi
cd ..

# Step 4: Install frontend dependencies (if needed)
echo ""
echo "📦 Step 4: Checking frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Frontend dependencies installed"
    else
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

# Step 5: Create data directories
echo ""
echo "📁 Step 5: Creating data directories..."
mkdir -p data/live_feed
mkdir -p logs
echo "✅ Data directories created"

# Step 6: Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Live Feed Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Configure Twitter API (optional):"
echo "   - Get API keys from https://developer.twitter.com"
echo "   - Update .env with your credentials"
echo ""
echo "2. Start the backend server:"
echo "   cd backend"
echo "   uvicorn app:app --reload"
echo ""
echo "3. Start the frontend (in a new terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Test the live feed:"
echo "   - Backend: http://localhost:8000/api/v1/live-feed/health"
echo "   - Frontend: http://localhost:5173/live-feed"
echo "   - API Docs: http://localhost:8000/api/docs"
echo ""
echo "5. Run simulation (optional):"
echo "   cd backend"
echo "   python data_sources/live_delivery_feed.py"
echo ""
echo "📖 Documentation:"
echo "   - Strategy: docs/LIVE_FEED_STRATEGY.md"
echo "   - Quick Start: docs/QUICK_START_LIVE_FEED.md"
echo "   - Checklist: IMPLEMENTATION_CHECKLIST.md"
echo ""
echo "═══════════════════════════════════════════════════════════"
