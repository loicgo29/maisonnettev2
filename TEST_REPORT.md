# maisonnettev2 - Test Report

## Executive Summary

- **Date**: 2026-08-25
- **Status**: ⚠️ PARTIAL SUCCESS - Backend healthy, Frontend needs fix
- **BDD Tests**: 3/3 smoke tests passing ✅
- **Critical Issues**: 1 (Frontend React/SvelteKit conflict)

---

## ✅ Passing Tests

### Smoke Tests (BDD)

```
✔ Scenario: All Docker services are healthy
  - maisonnettev2-frontend container is running ✓
  - maisonnettev2-backend container is running ✓
  - postgres-maisonnettev2 container is running ✓
  - No container is restarting ✓

✔ Scenario: Backend API is healthy
  - http://localhost:3001/health returns 200 ✓
  - Response contains "status": "healthy" ✓

✔ Scenario: Database connection works
  - PostgreSQL connection on port 5433 succeeds ✓
  - Database query returns valid results ✓
```

### Backend API Endpoints
- ✅ Health check: `GET http://localhost:3001/health` → 200 OK
- ✅ Swagger docs: `GET http://localhost:3001/api/docs` → 200 OK
- ✅ Database: Connected and queryable

---

## ❌ Critical Issues

### Issue 1: Frontend Technology Conflict

**Problem**: The frontend mixes incompatible frameworks:
- `frontend/app.html` → **SvelteKit template** (uses `%sveltekit.body%`)
- `frontend/src/App.tsx` → **React + React Router** (expects DOM)

**Result**: Frontend renders empty page at http://localhost:5173
```
Expected:  SvelteKit app with routes
Actual:    Only "Maisonnette v2" title, no UI
Reason:    SvelteKit template can't mount React app
```

**Why it happened**: 
- Project has two frontend versions: `frontend/` and `frontend-new/`
- `frontend/` is incomplete/mixed tech
- `frontend-new/` is pure SvelteKit (complete and working)

**Solutions** (ordered by recommendation):

#### Option A: Use frontend-new (Recommended ✅)
```bash
# Remove broken frontend
rm -rf frontend

# Rename working version
mv frontend-new frontend

# Update docker-compose.yml to point to new frontend
```
- ✅ SvelteKit 5 + Vite 8 (latest)
- ✅ Proper route structure in `frontend/src/routes/`
- ✅ No React dependency conflicts
- ⏱️ ~5 minutes to implement

#### Option B: Fix frontend to use React only
```bash
# Remove SvelteKit config
rm svelte.config.js
rm src/app.html

# Create Vite React app.html
# Remove @sveltejs/* from package.json
```
- ✅ React Router works as intended
- ⚠️ Requires rewriting dependencies
- ⏱️ ~20 minutes

#### Option C: Convert to pure SvelteKit
```bash
# Remove React + React Router
# Convert pages to SvelteKit routes
# Use +page.svelte instead of components
```
- ✅ SvelteKit is lighter weight
- ⚠️ Requires rewriting all pages
- ⏱️ ~1 hour

---

## 🚀 Deployment Readiness

### Before Deployment

- [ ] **Fix Frontend** (Choose one option above)
  - Recommended: Switch to `frontend-new`
  - Test at http://localhost:5173
  - Verify all routes load

- [ ] **Run BDD Tests** 
  ```bash
  npm run test:bdd -- tests/features/smoke-test.feature
  ```
  Expected: 3/3 passing

- [ ] **Test API Endpoints**
  ```bash
  curl http://localhost:3001/health
  curl http://localhost:3001/api/docs
  ```

- [ ] **Database Backup**
  ```bash
  docker exec postgres-maisonnettev2 pg_dump -U maisonnettev2 maisonnettev2 > backup.sql
  ```

### Environment Checklist

```
✓ Docker containers running
✓ Backend API responding
✓ Database connected
✓ .env file present with all required keys:
  - DB_USER=maisonnettev2
  - DB_PASSWORD=dev_password_change_me
  - NODE_ENV=development
  - VITE_API_URL=http://localhost:3001
  - STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, etc.
```

---

## 📊 Test Coverage

### Current BDD Scenarios

| Feature | Scenarios | Passing | Status |
|---------|-----------|---------|--------|
| smoke-test.feature | 3 | 3 ✅ | Production Ready |
| authentication.feature | 9 | 0 | Awaiting fix |
| caddy.feature | 12 | 0 | Caddy not configured |
| booking.feature | 10 | 0 | Not implemented |
| health-check.feature | 7 | 0 | Partially implemented |

### Recommended BDD Additions After Frontend Fix

1. **Booking Flow** - Reservation creation and payment
2. **Property Search** - Filter, pagination, availability
3. **User Authentication** - Login, logout, JWT validation
4. **Admin Dashboard** - Property management
5. **Error Handling** - Invalid inputs, edge cases

---

## 🔧 Running Tests

### Quick Health Check
```bash
npm run test:bdd -- tests/features/smoke-test.feature
```

### Run All Tests
```bash
npm run test:bdd
# or
npm run test:tunnel  # For Cloudflare tunnel tests
```

### Custom Test Run
```bash
export DB_PASSWORD=dev_password_change_me
npx cucumber-js tests/features/smoke-test.feature --require tests/steps
```

---

## 📝 Next Steps

1. **Immediate** (Required before ship):
   - [ ] Fix frontend (Option A recommended)
   - [ ] Verify BDD tests pass
   - [ ] Test all API endpoints

2. **Before Production**:
   - [ ] Update environment variables for prod
   - [ ] Run full BDD test suite
   - [ ] Backup database
   - [ ] Deploy via Ansible

3. **Post-Deployment**:
   - [ ] Monitor health endpoints
   - [ ] Set up error logging (Sentry)
   - [ ] Configure email (Resend)
   - [ ] Test payment processing (Stripe)

---

## 📚 Documentation

- **Tests**: See `tests/features/` for all BDD scenarios
- **Steps**: See `tests/steps/` for test implementations
- **Architecture**: See `ARCHITECTURE.md`
- **API**: See http://localhost:3001/api/docs (Swagger)

---

**Generated**: 2026-08-25  
**Test Suite**: Cucumber + Playwright  
**Next Review**: After frontend fix + full test run
