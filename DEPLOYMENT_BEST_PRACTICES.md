# 🚀 Maisonnettev2 — Production Deployment Best Practices

## Overview

This document implements lessons learned from production deployment issues (August 2026). The root cause was **Docker build cache preventing environment variable injection** in the SvelteKit frontend at compile time.

---

## Problem Statement

### What Happened

**Production Issue:** Google Calendar OAuth2 callback returned "Could not determine client ID"

**Root Cause Chain:**
1. `.env.production` had correct values: `PRIVATE_GOOGLE_REDIRECT_URI=https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback`
2. `docker-compose up --build` used **Docker layer CACHE**
3. Build args were NOT re-evaluated
4. Frontend compiled without `PRIVATE_GOOGLE_REDIRECT_URI` (defaulted to `localhost`)
5. SvelteKit static private env vars set at **build time**, not runtime
6. OAuth2 callback handler saw empty `REDIRECT_URI`

**Why Tests Missed It:**
- 150+ unit tests used **mocks** (didn't test Docker build process)
- No E2E tests verifying environment variables were injected at build time
- Local development worked (used hot-reload, not Docker build)
- Only discovered in production after deployment

---

## Best Practices

### ✅ 1. DISABLE DOCKER CACHE IN PRODUCTION

```yaml
# docker-compose.prod.yml
frontend:
  build:
    context: ./frontend
    no_cache: true  # CRITICAL: Always rebuild from scratch
    args:
      PRIVATE_GOOGLE_CLIENT_ID: ${PRIVATE_GOOGLE_CLIENT_ID:?error}
      PRIVATE_GOOGLE_CLIENT_SECRET: ${PRIVATE_GOOGLE_CLIENT_SECRET:?error}
      PRIVATE_GOOGLE_REDIRECT_URI: ${PRIVATE_GOOGLE_REDIRECT_URI:?error}
```

**Why:** Docker layer cache can hide configuration changes. In production, environment variables may have changed since the last build. Disabling cache ensures fresh compilation with current env vars.

### ✅ 2. VALIDATE ENVIRONMENT VARIABLES AT BUILD TIME

```dockerfile
# frontend/Dockerfile
ARG PRIVATE_GOOGLE_CLIENT_ID
ARG PRIVATE_GOOGLE_CLIENT_SECRET
ARG PRIVATE_GOOGLE_REDIRECT_URI
ARG PRIVATE_GITE_CALENDAR_ID
ARG PUBLIC_AUTH_URL
ARG PUBLIC_AUTH_REALM
ARG PUBLIC_AUTH_CLIENT_ID

# Fail build if critical vars are missing
RUN if [ -z "${PRIVATE_GOOGLE_CLIENT_ID}" ]; then echo "ERROR: PRIVATE_GOOGLE_CLIENT_ID not set"; exit 1; fi
RUN if [ -z "${PRIVATE_GOOGLE_REDIRECT_URI}" ]; then echo "ERROR: PRIVATE_GOOGLE_REDIRECT_URI not set"; exit 1; fi
```

**Why:** Failing the build immediately reveals configuration errors before deployment. Better than discovering in production.

### ✅ 3. MANDATORY PRE-DEPLOYMENT CHECKLIST

```bash
# Run before every production deploy
./scripts/deploy-checklist.sh
```

**Checks:**
- ✓ `.env.production` exists
- ✓ All critical variables present
- ✓ Variables have correct URL format (HTTPS, not localhost)
- ✓ `docker-compose.prod.yml` has `no_cache: true`
- ✓ No secrets hardcoded in images

**Why:** Prevents common configuration mistakes before they reach production.

### ✅ 4. POST-DEPLOYMENT HEALTHCHECKS

```bash
# After containers start, verify:
curl https://maisonnette-pecheur-bertheaume.fr/api/health
curl https://maisonnette-pecheur-bertheaume.fr/api/calendar | jq .authUrl
```

**Verify:**
- Backend responds with `status: ok`
- Calendar endpoint returns `authUrl` with **correct REDIRECT_URI** (production domain)
- No `localhost` or `127.0.0.1` in auth URLs

**Why:** Catches configuration errors while deployment is still in progress (easy to rollback).

### ✅ 5. ENVIRONMENT VARIABLE INJECTION TESTS

All tests from `tests/e2e-env-vars.test.ts` verify:

```typescript
// CRITICAL: Test that REDIRECT_URI is NOT defaulted to localhost
expect(data.authUrl).toContain('https://maisonnette-pecheur-bertheaume.fr');
expect(data.authUrl).not.toContain('localhost');
```

**Why:** Unit tests with mocks can't catch Docker build-time injection failures. E2E tests verify the actual deployed image.

### ✅ 6. GITHUB ACTIONS WORKFLOW VALIDATION

The deploy workflow now:

1. **Pre-deploy:** Verify `.env.production` has all required vars
2. **Transfer:** Ensure `.env` reaches production server
3. **Verify:** Confirm critical vars are present on production machine
4. **Deploy:** Run `docker-compose up --build --no-cache` with explicit env-file
5. **Post-deploy:** Healthcheck + OAuth2 configuration validation

```yaml
# .github/workflows/deploy-hetzner.yml
- name: Verify .env.production integrity
  # Checks all critical vars before transfer
  
- name: Post-Deployment Healthchecks
  # Verifies Google Calendar REDIRECT_URI is correct
  # Checks backend health
  # Fails deployment if checks don't pass
```

**Why:** Automated validation prevents human error (forgetting to set a secret, typos in env vars).

---

## Deployment Workflow (Automated)

```
1. git push origin main
   ↓
2. GitHub Actions triggered
   ↓
3. Verify .env.production integrity
   ↓
4. Transfer .env.production to Hetzner via SSH
   ↓
5. Verify critical vars reached production
   ↓
6. Download code and run deploy.sh with --no-cache
   ↓
7. Post-deployment healthchecks
   ↓
8. Verify Google Calendar OAuth2 is correctly configured
   ↓
9. ✅ Deployment complete or ❌ Rollback on error
```

### Manual Deployment (If Needed)

```bash
# 1. Generate and verify .env.production locally
./setup-env.sh --prod
./scripts/deploy-checklist.sh

# 2. Transfer to Hetzner
scp .env.production deploy@maisonnette-pecheur-bertheaume.fr:/tmp/

# 3. Deploy on server
ssh deploy@maisonnette-pecheur-bertheaume.fr << 'EOF'
cd /opt/maisonnettev2
mv /tmp/.env.production .env

# CRITICAL: Disable cache
docker compose down frontend
docker compose -f docker-compose.prod.yml \
  --env-file .env \
  up -d --build --no-cache frontend

# Verify
sleep 10
curl -s https://maisonnette-pecheur-bertheaume.fr/api/calendar | jq .authUrl
EOF
```

---

## Environment Variable Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ Bitwarden (Source of Truth)                                 │
│ - maisonnettev2-google (client_id, client_secret, ...)      │
│ - maisonnettev2-prod-db (db_password)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─→ setup-env.sh (local) → .env.production (local)
                      │
                      └─→ GitHub Secrets (manual gh secret set)
                         │
                         ├─→ GitHub Actions workflow (gen .env.production)
                            │
                            └─→ scp to Hetzner (/opt/maisonnettev2/.env)
                               │
                               └─→ docker-compose read .env
                                  │
                                  └─→ Build args passed to frontend Dockerfile
                                     │
                                     └─→ SvelteKit compiles with env vars
                                        │
                                        └─→ PRIVATE_* vars embedded in bundle
```

**CRITICAL POINTS:**
- Variables must be in Bitwarden (never commit to git)
- GitHub Secrets must match Bitwarden values
- .env file on server must be transferred BEFORE docker-compose build
- docker-compose MUST use `--env-file .env` when building
- Docker cache MUST be disabled (no_cache: true)

---

## Testing Strategy

### Unit Tests (Mock-based)
- Fast, isolated, catch logic errors
- CANNOT catch: Docker build issues, environment variable injection, deployment config

### E2E Tests (Real Production)
- Run against deployed environment
- Verify actual behavior with real OAuth2 clients, real databases, real secrets
- Catch: Configuration errors, deployment issues, integration problems

### New E2E Tests Added (2026-08-31)
```bash
tests/e2e-env-vars.test.ts
- Verify PRIVATE_GOOGLE_REDIRECT_URI injected correctly
- Verify Google Calendar OAuth2 authUrl is production domain
- Verify no localhost fallbacks in production
- Verify backend health checks validate environment
```

### CI/CD Automated Tests
```yaml
# .github/workflows/ci.yml
- npm run lint
- npm run type-check
- npm run test              # Unit + integration
- npm run test:bdd          # BDD scenarios

# .github/workflows/deploy-hetzner.yml
- Verify .env.production integrity
- Post-deployment healthchecks
- E2E environment variable validation
```

---

## Troubleshooting

### Issue: "Could not determine client ID from request"

**Diagnosis:**
```bash
ssh deploy@maisonnette-pecheur-bertheaume.fr
docker logs maisonnette-frontend | grep PRIVATE_GOOGLE
# Should see actual values, not empty strings
```

**Root Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| `.env` not on server | Verify: `cat /opt/maisonnettev2/.env \| grep PRIVATE_GOOGLE` |
| Build cache used | Rebuild: `docker compose down frontend && docker compose up -d --build --no-cache frontend` |
| `no_cache: true` missing | Add to `docker-compose.prod.yml` |
| GitHub Secret not set | Run: `gh secret set PRIVATE_GOOGLE_CLIENT_ID` in repo |

### Issue: Deployment Fails at Healthcheck

**Check logs:**
```bash
ssh deploy@maisonnette-pecheur-bertheaume.fr
docker logs maisonnette-backend | tail -50
docker logs maisonnette-frontend | tail -50
```

**Common reasons:**
- Database not initialized: Wait longer in healthcheck
- Keycloak not ready: Depends_on with healthcheck
- Secrets incomplete: Run `./scripts/deploy-checklist.sh`

---

## Checklist: New Deployments

- [ ] Run `./scripts/deploy-checklist.sh` locally
- [ ] Push to `main` branch (triggers GitHub Actions)
- [ ] Monitor GitHub Actions logs: `gh run view --log`
- [ ] Verify post-deployment healthchecks passed
- [ ] Test manually: `curl https://maisonnette-pecheur-bertheaume.fr/api/calendar`
- [ ] Verify OAuth2 REDIRECT_URI is production domain (not localhost)
- [ ] Run E2E tests: `npm run test tests/e2e-env-vars.test.ts`

---

## Checklist: Secret Updates

If you update secrets in Bitwarden:

1. **Local:**
   ```bash
   ./setup-env.sh --prod
   ./scripts/deploy-checklist.sh
   ```

2. **GitHub Secrets:**
   ```bash
   gh secret set SECRET_NAME < <(grep SECRET_NAME .env.production | cut -d= -f2)
   ```

3. **Deploy:**
   ```bash
   gh workflow run deploy-hetzner.yml
   ```

---

## Key Files Modified (2026-08-31)

- `docker-compose.prod.yml` — Added `no_cache: true` + var validation
- `.github/workflows/deploy-hetzner.yml` — Enhanced with pre/post validation
- `scripts/deploy-checklist.sh` — Pre-deployment verification
- `tests/e2e-env-vars.test.ts` — E2E tests for environment variables
- `DEPLOYMENT_BEST_PRACTICES.md` — This document

---

## Summary

**Before:** Environment variable injection could silently fail. Discovered only in production after user report.

**After:**
1. ✅ Docker cache disabled (forces fresh build)
2. ✅ Build args validated at compile time
3. ✅ Pre-deployment checklist verifies configuration
4. ✅ Post-deployment healthchecks validate OAuth2 setup
5. ✅ E2E tests verify environment variables are correctly injected
6. ✅ GitHub Actions workflow automated with validation gates

**Result:** Configuration errors detected **before** they reach production. If deployment fails, root cause is immediately clear.
