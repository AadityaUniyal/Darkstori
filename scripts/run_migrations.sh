#!/bin/bash

# Database Migration Runner
# This script runs Alembic migrations safely

echo "========================================="
echo "  Database Migration Runner"
echo "========================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with DATABASE_URL"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env"
    exit 1
fi

echo "✅ Environment loaded"
echo "Database: ${DATABASE_URL%%@*}@***"
echo ""

# Check current migration status
echo "📊 Current migration status:"
alembic current
echo ""

# Show pending migrations
echo "📋 Pending migrations:"
alembic heads
echo ""

# Ask for confirmation
read -p "Do you want to run migrations? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Running migrations..."
    alembic upgrade head
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migrations completed successfully!"
        echo ""
        echo "📊 New migration status:"
        alembic current
        echo ""
        echo "✅ Database is up to date!"
    else
        echo ""
        echo "❌ Migration failed!"
        echo "Please check the error messages above"
        exit 1
    fi
else
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "========================================="
echo "  Migration Complete"
echo "========================================="
