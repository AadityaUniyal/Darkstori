# Scripts Directory

Utility scripts for database migrations, setup, and maintenance.

## 📋 Available Scripts

### Database Migration

#### `run_migrations.sh` (Linux/Mac)
```bash
chmod +x scripts/run_migrations.sh
./scripts/run_migrations.sh
```

#### `run_migrations.bat` (Windows)
```bash
scripts\run_migrations.bat
```

**What it does:**
- Checks database connection
- Shows current migration status
- Runs pending migrations
- Verifies completion

### Live Feed Setup

#### `setup_live_feed.sh` (Linux/Mac)
```bash
chmod +x scripts/setup_live_feed.sh
./scripts/setup_live_feed.sh
```

#### `setup_live_feed.bat` (Windows)
```bash
scripts\setup_live_feed.bat
```

**What it does:**
- Installs Python dependencies (aiohttp, beautifulsoup4, tweepy)
- Updates .env with live feed configuration
- Tests live feed module
- Installs frontend dependencies
- Creates data directories

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 2. Run migrations
./scripts/run_migrations.sh  # or .bat on Windows

# 3. Set up live feed
./scripts/setup_live_feed.sh  # or .bat on Windows
```

### Regular Use

```bash
# Run migrations after pulling new code
./scripts/run_migrations.sh

# Check migration status
alembic current

# View migration history
alembic history
```

## 📝 Notes

- Always backup your database before running migrations
- Scripts check for .env file and DATABASE_URL
- Migration scripts are idempotent (safe to run multiple times)
- Setup scripts skip already installed dependencies

## 🔧 Troubleshooting

### Issue: Permission denied

**Solution:**
```bash
chmod +x scripts/*.sh
```

### Issue: DATABASE_URL not found

**Solution:**
```bash
# Ensure .env exists and has DATABASE_URL
cat .env | grep DATABASE_URL
```

### Issue: Migration fails

**Solution:**
```bash
# Check current status
alembic current

# Downgrade if needed
alembic downgrade -1

# Re-run migration
alembic upgrade head
```

## 📚 Related Documentation

- [Database Schema](../docs/DATABASE_SCHEMA.md)
- [Quick Start Database](../docs/QUICK_START_DATABASE.md)
- [Quick Start Live Feed](../docs/QUICK_START_LIVE_FEED.md)
