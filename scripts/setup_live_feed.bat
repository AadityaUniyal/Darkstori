@echo off
REM Live Feed Setup Script for Windows
REM This script sets up the live delivery feed system

echo.
echo ========================================
echo   Live Delivery Feed Setup
echo ========================================
echo.

REM Check if we're in the project root
if not exist "README.md" (
    echo ERROR: Please run this script from the project root directory
    exit /b 1
)

REM Step 1: Install Python dependencies
echo Step 1: Installing Python dependencies...
cd backend
pip install aiohttp==3.9.1 beautifulsoup4==4.12.2 tweepy==4.14.0
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    exit /b 1
)
echo SUCCESS: Python dependencies installed
cd ..

REM Step 2: Update .env file
echo.
echo Step 2: Updating environment variables...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
)

REM Check if live feed settings already exist
findstr /C:"LIVE_FEED_ENABLED" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo. >> .env
    echo # Live Feed Configuration >> .env
    echo LIVE_FEED_ENABLED=true >> .env
    echo LIVE_FEED_UPDATE_INTERVAL=300 >> .env
    echo LIVE_FEED_RETENTION_HOURS=24 >> .env
    echo. >> .env
    echo # Twitter API (Optional) >> .env
    echo TWITTER_API_KEY=your_twitter_api_key >> .env
    echo TWITTER_API_SECRET=your_twitter_api_secret >> .env
    echo TWITTER_ACCESS_TOKEN=your_access_token >> .env
    echo TWITTER_ACCESS_SECRET=your_access_secret >> .env
    echo SUCCESS: Environment variables added to .env
) else (
    echo SUCCESS: Live feed settings already exist in .env
)

REM Step 3: Install frontend dependencies
echo.
echo Step 3: Checking frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        exit /b 1
    )
    echo SUCCESS: Frontend dependencies installed
) else (
    echo SUCCESS: Frontend dependencies already installed
)
cd ..

REM Step 4: Create data directories
echo.
echo Step 4: Creating data directories...
if not exist "data\live_feed" mkdir data\live_feed
if not exist "logs" mkdir logs
echo SUCCESS: Data directories created

REM Step 5: Summary
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Configure Twitter API (optional):
echo    - Get API keys from https://developer.twitter.com
echo    - Update .env with your credentials
echo.
echo 2. Start the backend server:
echo    cd backend
echo    uvicorn app:app --reload
echo.
echo 3. Start the frontend (in a new terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 4. Test the live feed:
echo    - Backend: http://localhost:8000/api/v1/live-feed/health
echo    - Frontend: http://localhost:5173/live-feed
echo    - API Docs: http://localhost:8000/api/docs
echo.
echo 5. Run simulation (optional):
echo    cd backend
echo    python data_sources/live_delivery_feed.py
echo.
echo Documentation:
echo    - Strategy: docs\LIVE_FEED_STRATEGY.md
echo    - Quick Start: docs\QUICK_START_LIVE_FEED.md
echo    - Checklist: IMPLEMENTATION_CHECKLIST.md
echo.
echo ========================================

pause
