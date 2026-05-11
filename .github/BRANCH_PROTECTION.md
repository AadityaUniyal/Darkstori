# Branch Protection Setup Guide

## Problem

Currently, commits are being pushed directly to `main` without PR review, causing:

- 25+ CD pipeline runs wasted on individual refactor commits
- Untested changes deployed directly to production
- No CI validation before merge

## Solution: Enable Branch Protection

### Steps to Enable (GitHub Settings)

1. Go to: **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable these settings:

#### Required Settings

- ✅ **Require a pull request before merging**
  - Require approvals: 1 (or 0 for solo projects)
  - Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Status checks that are required:
    - `CI / Lint Python`
    - `CI / Lint Frontend`
    - `CI / Test Backend`
    - `CI / Check Migrations`
    - `CI / Build Docker Images`

- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**
  - This blocks direct pushes to main (even from admins)

#### Optional but Recommended

- ✅ **Require linear history** (prevents merge commits, keeps history clean)
- ✅ **Require deployments to succeed before merging** (if using GitHub Environments)

### Workflow After Enabling

```bash
# Create feature branch
git checkout -b fix/some-issue

# Make changes
git add .
git commit -m "fix: description"

# Push to branch
git push origin fix/some-issue

# Open PR on GitHub
# Wait for CI checks to pass
# Merge via GitHub UI (not command line)
```

### For Batched Refactors

```bash
# Create refactor branch
git checkout -b refactor/code-cleanup

# Make ALL refactor changes
# ... edit multiple files ...

# Commit once
git add -A
git commit -m "refactor: clean up imports, formatting, and structure"

# Push and create PR
git push origin refactor/code-cleanup
```

This reduces 14 separate commits + 14 CI runs → 1 commit + 1 CI run.

## Deploy Strategy Change

The CD workflow has been updated to deploy only on version tags, not every push to main.

### New Deploy Process

```bash
# After PR is merged to main, create a release tag
git checkout main
git pull origin main

# Create and push version tag
git tag v1.0.1
git push origin v1.0.1
```

This triggers:

- CD / Publish Docker Images
- CD / Create Release
- CD / Deploy Backend
- CD / Deploy Frontend

### Benefits

- Explicit control over what gets deployed
- Semantic versioning for releases
- Reduced CI/CD costs (no deploy on every commit)
- Clear deployment history via GitHub Releases

## Current Status

- ❌ Branch protection: **NOT ENABLED** (must be done via GitHub UI)
- ✅ CD trigger: **Updated to deploy on tags** (in cd.yml)
- ⚠️ Recommendation: Enable branch protection ASAP to prevent future direct pushes

## References

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
