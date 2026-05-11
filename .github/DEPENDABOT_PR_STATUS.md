# Dependabot PR Status & Merge Plan

**Last Updated:** May 11, 2026  
**Total Open PRs:** 14  
**Status:** 13 merged/closed, 14 remaining

---

## ✅ SAFE TO MERGE NOW (Priority 1)

Merge these immediately after CI is green. These are patch/minor updates with no breaking changes.

| PR # | Package                    | Change          | Risk | Notes                              |
| ---- | -------------------------- | --------------- | ---- | ---------------------------------- |
| #3   | docker/setup-buildx-action | 3 → 4           | Low  | Fixes Node.js 20 deprecation       |
| #5   | docker/login-action        | 3 → 4           | Low  | Fixes Node.js 20 deprecation       |
| #17  | python-dotenv              | 1.0.0 → 1.2.2   | Low  | Patch update, backward compatible  |
| #15  | beautifulsoup4             | 4.12.2 → 4.14.3 | Low  | Patch update, scraper improvements |

**Merge Command:**

```bash
# After CI passes on main
gh pr merge 3 --auto --squash
gh pr merge 5 --auto --squash
gh pr merge 17 --auto --squash
gh pr merge 15 --auto --squash
```

---

## ⚠️ REVIEW CAREFULLY (Priority 2)

Test locally before merging. These are major/minor version bumps that may have breaking changes.

### PR #6: node 18-alpine → 26-alpine

**Risk:** Medium  
**Breaking Changes:** Node.js 26 may have deprecated APIs

**Test Plan:**

```bash
# Update Dockerfile.frontend locally
FROM node:26-alpine as builder

# Build and test
docker build -f Dockerfile.frontend -t test-frontend .
cd frontend && npm ci && npm run build
```

**Check for:**

- Deprecated npm features
- Changed default behaviors
- Build performance changes

---

### PR #10: celery 5.3.4 → 5.6.3

**Risk:** Medium  
**Breaking Changes:** Task signature changes, new configuration options

**Test Plan:**

```bash
pip install celery==5.6.3
# Check if any tasks fail
celery -A backend.celery_app worker --loglevel=info
```

**Check for:**

- Task signature compatibility
- Broker connection changes
- Result backend changes

---

### PR #14: mlflow 2.10.2 → 3.12.0

**Risk:** HIGH  
**Breaking Changes:** Major version bump, API changes expected

**Test Plan:**

```bash
pip install mlflow==3.12.0
# Test model tracking
python backend/ml/train_model.py
# Test model loading
python backend/ml/model_loader.py
```

**Check for:**

- Model registry API changes
- Tracking URI format changes
- Artifact storage compatibility
- Experiment tracking changes

**Documentation:** https://mlflow.org/docs/latest/release-notes.html

---

### PR #16: pydantic 2.5.3 → 2.13.4

**Risk:** Medium  
**Breaking Changes:** Validator syntax changes, model config changes

**Test Plan:**

```bash
pip install pydantic==2.13.4
# Run all tests
pytest backend/tests/ -v
# Check API schemas
python -c "from backend.ml.schemas import *"
```

**Check for:**

- `@validator` → `@field_validator` migrations
- `Config` class → `model_config` dict
- Validation error message changes

---

### PR #18: aiosmtplib 3.0.1 → 5.1.0

**Risk:** Medium  
**Breaking Changes:** Async API changes

**Test Plan:**

```bash
pip install aiosmtplib==5.1.0
# Test email sending (if implemented)
python -c "from backend.ml.alert_manager import AlertManager; AlertManager().send_alert('test')"
```

**Check for:**

- Connection method changes
- TLS/SSL configuration changes
- Send method signature changes

---

## ❌ DO NOT MERGE YET (Priority 3)

These require more work or should be rejected.

### PR #4: actions/checkout 4 → 6

**Risk:** Medium  
**Status:** Wait for stable release  
**Reason:** Version 6 may still be in beta/RC

**Action:** Check https://github.com/actions/checkout/releases for stable v6 release

---

### PR #12: pytest 7.4.3 → 9.0.3

**Risk:** Medium  
**Status:** Wait until tests are passing  
**Reason:** Don't upgrade test framework while tests are failing

**Action:** Merge after all CI tests are green and stable for 1 week

---

### PR #20: python 3.11 → 3.14-slim

**Risk:** CRITICAL  
**Status:** REJECT  
**Reason:** Python 3.14 is pre-release (not stable until Oct 2026)

**Action:** Close PR with comment:

```
Python 3.14 is still in alpha/beta. We'll upgrade after the stable
release in October 2026. Closing for now.
```

---

### PR #21: recharts 2 → 3

**Risk:** HIGH  
**Status:** Review breaking changes  
**Reason:** Major version bump with API changes

**Breaking Changes:**

- Chart component prop changes
- Tooltip API changes
- Legend configuration changes

**Action:** Review migration guide at https://recharts.org/en-US/guide/upgrade

---

### PR #27: react-leaflet 4 → 5

**Risk:** HIGH  
**Status:** Review breaking changes  
**Reason:** Major version bump with API changes

**Breaking Changes:**

- Map component initialization changes
- Layer prop changes
- Event handler changes

**Action:** Review migration guide at https://react-leaflet.js.org/docs/start-introduction/

---

## Merge Strategy

### Phase 1: Safe Updates (This Week)

1. Merge PRs #3, #5, #17, #15 after CI is green
2. Monitor for any issues
3. Deploy to staging (if available)

### Phase 2: Medium Risk Updates (Next Week)

1. Test PRs #6, #10, #16, #18 locally
2. Create feature branch for each
3. Run full test suite
4. Merge one at a time with 24h monitoring between each

### Phase 3: High Risk Updates (Next Sprint)

1. Review migration guides for #14, #21, #27
2. Create dedicated feature branches
3. Update code to match new APIs
4. Add tests for new behavior
5. Merge after thorough testing

### Phase 4: Cleanup

1. Close PR #20 (Python 3.14 - too early)
2. Wait for PR #4 stable release
3. Merge PR #12 after tests are stable

---

## Automated Merge Setup

To auto-merge safe Dependabot PRs in the future:

```yaml
# .github/workflows/auto-merge-dependabot.yml
name: Auto-merge Dependabot PRs

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Check if safe to merge
        id: check
        run: |
          # Only auto-merge patch updates
          if [[ "${{ github.event.pull_request.title }}" =~ "Bump.*from.*to.*\.[0-9]+\.[0-9]+$" ]]; then
            echo "safe=true" >> $GITHUB_OUTPUT
          fi

      - name: Enable auto-merge
        if: steps.check.outputs.safe == 'true'
        run: gh pr merge --auto --squash "${{ github.event.pull_request.number }}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Monitoring After Merge

After merging any PR, monitor:

1. **CI/CD Pipeline:** All checks should remain green
2. **Application Logs:** No new errors or warnings
3. **Performance Metrics:** No degradation in response times
4. **Error Tracking:** No increase in error rates

If issues are detected:

```bash
# Revert the merge
git revert <commit-hash>
git push origin main

# Or rollback to previous tag
git tag v1.0.0-rollback <previous-good-commit>
git push origin v1.0.0-rollback
```

---

## References

- Dependabot Configuration: `.github/dependabot.yml`
- CI/CD Status: `.github/CI_CD_FIXES_SUMMARY.md`
- Branch Protection: `.github/BRANCH_PROTECTION.md`
