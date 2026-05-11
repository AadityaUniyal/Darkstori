# GitHub Secrets Configuration Guide

This document lists all required GitHub secrets for CI/CD pipelines to work correctly.

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret listed below

---

## Required Secrets for CI/CD

### Database Secrets

#### `DATABASE_URL`
- **Description**: PostgreSQL connection string for production database
- **Format**: `postgresql://username:password@host:port/database`
- **Example**: `postgresql://darkstori_user:secure_password@db.example.com:5432/darkstori_prod`
- **Used in**: CI migrations, backend tests, deployments

#### `NEON_DATABASE_URL` (if using Neon)
- **Description**: Neon PostgreSQL connection string
- **Format**: `postgresql://username:password@host.neon.tech/database?sslmode=require`
- **Example**: `postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/darkstori?sslmode=require`
- **Used in**: Production deployments

---

### Authentication & Security

#### `JWT_SECRET_KEY`
- **Description**: Secret key for JWT token signing (minimum 32 characters)
- **Format**: Random string, at least 32 characters
- **Generate with**: `openssl rand -hex 32`
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Used in**: Backend authentication, CI tests

#### `SECRET_KEY`
- **Description**: General application secret key
- **Format**: Random string, at least 32 characters
- **Generate with**: `openssl rand -hex 32`
- **Used in**: Session management, CSRF protection

---

### Docker Registry Secrets

#### `DOCKERHUB_USERNAME`
- **Description**: Docker Hub username for pushing images
- **Example**: `yourusername`
- **Used in**: CD pipeline for publishing Docker images

#### `DOCKERHUB_TOKEN`
- **Description**: Docker Hub access token (NOT your password)
- **How to get**: 
  1. Go to https://hub.docker.com/settings/security
  2. Click "New Access Token"
  3. Copy the generated token
- **Used in**: CD pipeline for publishing Docker images

**Note**: If using GitHub Container Registry (ghcr.io) instead, you don't need these. The `GITHUB_TOKEN` is automatically available.

---

### Deployment Platform Secrets

#### `RAILWAY_TOKEN` (if using Railway)
- **Description**: Railway API token for deployments
- **How to get**: 
  1. Go to https://railway.app/account/tokens
  2. Create a new token
- **Used in**: CD pipeline for backend deployment

#### `VERCEL_TOKEN` (if using Vercel)
- **Description**: Vercel authentication token
- **How to get**: 
  1. Go to https://vercel.com/account/tokens
  2. Create a new token
- **Used in**: CD pipeline for frontend deployment

#### `VERCEL_ORG_ID` (if using Vercel)
- **Description**: Your Vercel organization/team ID
- **How to get**: Run `vercel link` in your project and check `.vercel/project.json`

#### `VERCEL_PROJECT_ID` (if using Vercel)
- **Description**: Your Vercel project ID
- **How to get**: Run `vercel link` in your project and check `.vercel/project.json`

---

### Optional Secrets

#### `CODECOV_TOKEN`
- **Description**: Token for uploading code coverage reports
- **How to get**: Sign up at https://codecov.io and link your repository
- **Used in**: CI pipeline for coverage reporting
- **Note**: Optional, CI will continue if this fails

#### `GOOGLE_MAPS_API_KEY`
- **Description**: Google Maps API key for geocoding and places
- **How to get**: https://console.cloud.google.com/apis/credentials
- **Used in**: Backend API for location services

#### `REDIS_URL`
- **Description**: Redis connection string for caching
- **Format**: `redis://username:password@host:port/db`
- **Example**: `redis://default:password@redis.example.com:6379/0`
- **Used in**: Production backend

---

## Verification Checklist

After adding secrets, verify they work:

- [ ] Push a commit to trigger CI/CD
- [ ] Check that "Check Migrations" job passes
- [ ] Check that "Test Backend" job passes
- [ ] Check that "Lint Frontend" job passes
- [ ] Check that "Publish Docker Images" job passes (on main branch)
- [ ] Verify deployments work (if configured)

---

## Security Best Practices

1. **Never commit secrets to the repository**
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Use different secrets for development, staging, and production**
4. **Limit secret access** to only the workflows that need them
5. **Use environment-specific secrets** when possible
6. **Monitor secret usage** in GitHub Actions logs

---

## Troubleshooting

### "Secret not found" error
- Verify the secret name matches exactly (case-sensitive)
- Check that the secret is added to the correct repository
- Ensure you're not trying to access secrets in a forked repository (they're not available in forks for security)

### "Authentication failed" error
- Verify the secret value is correct
- Check if the token/key has expired
- Ensure the token has the necessary permissions

### "Database connection failed" error
- Verify DATABASE_URL format is correct
- Check that the database server allows connections from GitHub Actions IPs
- Ensure the database exists and credentials are valid

---

## Contact

For questions or issues with secrets setup, contact: aaditya.uniyal22@gmail.com
