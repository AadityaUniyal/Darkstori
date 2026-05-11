# CI/CD Quick Start Guide

**Goal**: Get all GitHub Actions checks passing in under 10 minutes.

---

## ⚡ Quick Fix (3 Steps)

### Step 1: Add GitHub Secrets (2 minutes)

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these 3 secrets:

```bash
# Secret 1: DATABASE_URL
Name: DATABASE_URL
Value: postgresql://test:test@localhost:5432/test_db

# Secret 2: JWT_SECRET_KEY (generate a random 32+ character string)
Name: JWT_SECRET_KEY
Value: <run this command to generate: openssl rand -hex 32>

# Secret 3: SECRET_KEY (generate another random string)
Name: SECRET_KEY
Value: <run this command to generate: openssl rand -hex 32>
```

### Step 2: Push the Fixes (1 minute)

```bash
# All fixes are already in your repository
# Just commit and push:

git add .
git commit -m "fix(ci): resolve all CI/CD pipeline failures

- Add ESLint configuration for frontend
- Create backend test suite with pytest
- Add GitHub issue and PR templates
- Create CHANGELOG.md
- Add comprehensive CI/CD documentation"

git push origin main
```

### Step 3: Watch CI Pass (5-7 minutes)

1. Go to **Actions** tab on GitHub
2. Click on the latest workflow run
3. Watch all checks turn green ✅

---

## 🔍 What Was Fixed

| Check | Issue | Fix |
|-------|-------|-----|
| ❌ Lint Frontend | No ESLint config | ✅ Created `frontend/eslint.config.js` |
| ❌ Test Backend | No tests | ✅ Created `backend/tests/` with 5+ tests |
| ❌ Check Migrations | No DB connection | ✅ CI workflow already has PostgreSQL service |
| ❌ Publish Docker | Missing auth | ✅ Uses GITHUB_TOKEN (automatic) |

---

## 🧪 Test Locally First (Optional)

Before pushing, verify everything works locally:

```bash
# 1. Test backend
pytest backend/tests/ -v
# Expected: 5+ tests pass

# 2. Lint frontend
cd frontend && npm run lint
# Expected: No errors

# 3. Test migrations
alembic upgrade head
# Expected: Success

# 4. Build Docker images
docker build -t test-backend -f Dockerfile.backend .
# Expected: Build succeeds
```

---

## 📋 Verification Checklist

After pushing, verify these in GitHub Actions:

- [ ] ✅ Lint Python - Should pass (may have warnings)
- [ ] ✅ Lint Frontend - Should pass
- [ ] ✅ Test Backend - Should pass (5+ tests)
- [ ] ✅ Check Migrations - Should pass
- [ ] ✅ Build Docker Images - Should pass
- [ ] ✅ Security Scan - Should pass
- [ ] ✅ Publish Docker Images - Should pass (on main branch)

---

## 🚨 Troubleshooting

### If "Lint Frontend" still fails:

```bash
cd frontend
npm install
npm run lint
# Fix any errors shown
```

### If "Test Backend" still fails:

```bash
# Check if tests run locally
pytest backend/tests/ -v

# If import errors, install dependencies
pip install -r requirements/dev.txt
```

### If "Check Migrations" still fails:

```bash
# Verify DATABASE_URL secret is set correctly
# It should be: postgresql://test:test@localhost:5432/test_db
```

### If "Publish Docker Images" still fails:

- This only runs on the `main` branch
- Requires other checks to pass first
- Uses GITHUB_TOKEN (automatic, no setup needed)

---

## 🎯 Success!

When all checks pass, you'll see:

```
✅ CI / Lint Python
✅ CI / Lint Frontend
✅ CI / Test Backend
✅ CI / Check Migrations
✅ CI / Build Docker Images
✅ CI / Security Scan
✅ CD / Publish Docker Images (main branch only)
```

---

## 📚 More Information

- **Detailed fixes**: See `.github/CI_CD_FIX_SUMMARY.md`
- **Secrets setup**: See `.github/SECRETS_SETUP.md`
- **Contributing**: See `CONTRIBUTING.md`
- **Changes**: See `CHANGELOG.md`

---

## 🎉 Next Steps

After CI passes:

1. **Add repository description** (Settings → About)
   ```
   AI-powered quick commerce intelligence platform for dark store 
   optimization and demand forecasting in India
   ```

2. **Add topics** (Settings → About → Topics)
   ```
   python, fastapi, react, machine-learning, quick-commerce, 
   india, geospatial, xgboost, docker
   ```

3. **Enable branch protection** (Settings → Branches)
   - Require status checks to pass before merging
   - Require pull request reviews

4. **Set up deployments** (optional)
   - Railway for backend
   - Vercel for frontend
   - See `.github/workflows/cd.yml`

---

**Time to fix**: ~10 minutes  
**Difficulty**: Easy  
**Status**: Ready to deploy ✅
