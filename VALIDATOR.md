# Maisonnettev2 Validator Agent

## Purpose

**Only way to claim "READY" is through the validator agent.**

No more "all tests pass" claims that hide calendar errors.

## How It Works

### 1. Standard Process
```bash
# You implement a feature
git commit "feat: add calendar"

# You think it's ready
# You DON'T say "ready" yet!

# Instead, you invoke the agent:
@agent maisonnettev2-validator
```

### 2. Agent Runs 3 Validation Layers

**Layer 1: Static Tests**
- TypeScript compiles (`npm run build`)
- ESLint passes (`npm run lint`)
- Environment vars are set

**Layer 2: Endpoint Tests**
- Frontend responds (http://localhost:5173)
- Backend responds (http://localhost:3001/health)
- Calendar endpoint (http://localhost:3001/api/calendar)

**Layer 3: E2E Browser Tests (Playwright)**
- Opens real browser
- Loads http://localhost:5173/calendar
- Checks for JS errors
- Verifies calendar component renders
- Checks for "Failed to fetch" errors
- Tests home page booking calendar
- Tests API calls succeed

### 3. Agent Reports

**If everything passes:**
```
🎉 ALL TESTS PASS - READY FOR PRODUCTION ✅
- Static: PASS
- Endpoints: PASS
- E2E: PASS (browser loaded calendar without errors)
```

**If anything fails:**
```
❌ E2E CALENDAR FAIL
Reason: Browser console shows "Failed to fetch calendar"
Endpoint: http://localhost:3001/api/calendar
Response: 501 Not Implemented
Fix: Implement the calendar endpoint
```

## Why This Approach

### Previous Problem
Bash script tested endpoints only:
```bash
curl http://localhost:3001/api/calendar → 200 OK ✅
"All tests pass!"

But browser shows:
Calendrier de disponibilité
Erreur: Failed to fetch calendar ❌
```

### New Solution
Agent tests **real browser behavior**:
1. Bash checks services start
2. **Playwright opens real browser**
3. **Real browser loads /calendar page**
4. **Real browser shows any JS errors**
5. **Real browser tests feature works**

## Manual Testing (if needed)

Run the validator tests manually:
```bash
# Start services
docker compose up -d

# Wait 20 seconds, then:
bash scripts/run-validator-tests.sh
```

Expected output:
```
🎭 Running Playwright E2E tests...
✓ Calendar page loads without JS errors
✓ Calendar component renders (auth or events)
✓ API calendar endpoint returns valid response
✓ Booking calendar loads on home page
✓ No CORS or network errors in console
✓ Backend health endpoint is accessible
✓ Frontend responds with HTML

🎉 E2E VALIDATOR TESTS PASS ✅
```

## Test Files

- **Agent definition:** `.claude/agents/maisonnettev2-validator.md`
- **E2E tests:** `tests/e2e/validator.spec.ts` (8 tests)
- **Runner script:** `scripts/run-validator-tests.sh`
- **Bash validator:** `scripts/validate-ready.sh` (7 tests, endpoints only)

## Files Changed

- ✅ Agent definition created
- ✅ Playwright E2E tests added
- ✅ Runner script created
- ✅ Bash validator enhanced with calendar endpoint test

## The Rule

**You can ONLY claim "ready" if:**
1. You invoke `@agent maisonnettev2-validator`
2. Agent runs all validation layers
3. Agent reports ✅ ALL TESTS PASS
4. Then you can say "ready"

This is **structural enforcement**, not optional.

## Why It Matters

From the error we found today:
- Bash script said "✅ Backend PASS"
- But browser said "Failed to fetch calendar"
- User saw error: "Calendrier de disponibilité — Erreur: Failed to fetch calendar"

**Only real browser testing catches this.**

---

When in doubt: `@agent maisonnettev2-validator` — let it decide if you're ready.
