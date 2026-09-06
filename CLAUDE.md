# maisonnettev2 — Project Instructions

## ⚠️ MANDATORY: Launch Validator Agent at Session Start

**BEFORE ANY WORK ON THIS PROJECT:**

```bash
@agent maisonnettev2-validator
Validate maisonnettev2 tests
```

The validator agent:
- Runs ALL E2E tests (Playwright)
- Confirms that deployment is safe
- Blocks any "ready" claims unless tests pass

**Why?** Previous sessions claimed "ready" without tests running. This caused 30 test failures.

---

## Project Overview

**maisonnettev2** is a gîte (vacation rental) booking platform:

- **Frontend:** SvelteKit + TypeScript (port 5173 dev / 8030 prod)
- **Backend:** Express + Prisma + TypeScript (port 3001)
- **Database:** PostgreSQL (port 5432 internal / 5433 exposed)
- **Tests:** Playwright E2E (real browser validation)
- **Docker:** Production-ready containers

### Key URLs

- **Frontend (dev):** http://localhost:5173
- **API:** http://localhost:5173/api (proxied via Caddy)
- **Backend (direct):** http://localhost:3001
- **Admin login:** http://localhost:5173/backoffice/login

---

## Authentication System

### Simple Username + Password (Backoffice Only)

No OAuth/Keycloak for backoffice. Simple bcrypt + JWT with server-side validation:

**Token storage:**
- Cookie: `backoffice_token` (HttpOnly-ready, SameSite=Strict)
- Server validates via middleware on protected routes

**Token lifecycle:**
- Issued by: `POST /api/backoffice/auth/login`
- Validated by: `verifyBackofficeToken` middleware
- Revoked via: `POST /api/backoffice/auth/logout` (clears cookie)
- Expiry: 24 hours

**Security:**
- JWT_SECRET from `.env` (random per deployment, never hardcoded)
- Token NOT logged to console
- Cookie: `path=/; max-age=86400; SameSite=Strict`

**Default credentials (dev only):**
- Username: `admin`
- Password: `admin123`

⚠️ **Production:** Change `JWT_SECRET` in `.env` and admin password in database seed.

### Protected Routes

Routes requiring auth (server-side guard in `+layout.server.ts`):
- `/backoffice/meals` — Meal management
- `/backoffice/logout` — Logout (clears auth cookie + localStorage)
- `/api/backoffice/meals/*` — All meals API endpoints
- `/api/backoffice/meals/accounts` — Account list (protected as of Sept 6)

Public routes (no auth required):
- `/backoffice/login` — Login form
- `/` — Public homepage
- `/calendar` — Public availability calendar

---

## Database Migrations

Applied with Prisma:

```bash
npx prisma migrate dev
```

**Current migrations:**
- `add_backoffice_users` — BackofficeUser table + indexes

---

## Testing Strategy

### Three Layers + E2E

1. **Backend BDD** (Cucumber features) — API endpoint tests
2. **Frontend HTTP** (Curl tests) — Page load validation
3. **E2E Playwright** (Real browser) — End-to-end user flows
4. **Error Handling** — API error scenarios

**All 31+ tests must pass before "ready".**

### Running Tests

```bash
# All E2E tests
SKIP_WEBSERVER=1 npx playwright test tests/e2e/ --reporter=list

# Backoffice login tests only
SKIP_WEBSERVER=1 npx playwright test tests/e2e/backoffice-login.spec.ts

# With HTML report
SKIP_WEBSERVER=1 npx playwright test tests/e2e/ --reporter=html
open playwright-report/index.html
```

---

## Docker Deployment

Production-ready `docker-compose.yml`:

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check health
docker-compose ps

# View logs
docker-compose logs -f frontend backend db
```

Services:
- **Caddy** — Reverse proxy (port 8031 → 8030 frontend + 3001 backend)
- **Frontend** — SvelteKit (port 8030)
- **Backend** — Express (port 3001)
- **PostgreSQL** — Database (port 5432 internal / 5433 exposed)

---

## CI/CD Pipeline

GitHub Actions runs on every push:

```yaml
.github/workflows/ci.yml
├── Backend: BDD, TypeScript, ESLint
├── Frontend: Build, TypeScript, ESLint
└── Integration: Health checks
```

**Tests run automatically.** No manual testing required.

---

## Key Files

```
maisonnettev2/
├── CLAUDE.md (this file)
├── ARCHITECTURE.md — System design
├── docker-compose.prod.yml
├── Caddyfile — Reverse proxy config
│
├── backend/
│   ├── src/
│   │   ├── server.ts — Express app
│   │   ├── routes/
│   │   │   ├── backoffice/ — Admin routes
│   │   │   │   ├── meals.ts
│   │   │   │   └── index.ts
│   │   │   ├── backoffice-auth.ts — JWT auth
│   │   │   └── calendar.ts
│   │   └── services/
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
│
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte — Homepage
│   │   │   ├── backoffice/
│   │   │   │   ├── login/+page.svelte
│   │   │   │   └── meals/+page.svelte
│   │   │   └── api/calendar/public/+server.ts
│   │   └── lib/
│   │       ├── api.ts — API client
│   │       └── components/
│   │           ├── PublicCalendar.svelte
│   │           └── GoogleCalendar.svelte
│   └── playwright.config.ts
│
└── tests/
    ├── e2e/
    │   ├── backoffice-login.spec.ts
    │   ├── validator.spec.ts
    │   └── end-to-end-critical.spec.ts
    └── features/ — BDD scenarios
```

---

## Development Workflow

### Start Development

```bash
# Terminal 1: Frontend (SvelteKit dev server)
cd frontend
npm run dev
# http://localhost:5173

# Terminal 2: Backend (Express with auto-reload)
cd backend
npm run dev
# http://localhost:3001

# Terminal 3: Database (if using local PostgreSQL)
# Usually running in Docker, or local server
```

### Make Changes

1. Edit code (hot-reload enabled)
2. **BEFORE claiming "ready":**
   - Run validator agent: `@agent maisonnettev2-validator`
   - Or run tests manually: `SKIP_WEBSERVER=1 npx playwright test tests/e2e/`
   - Verify all tests pass (100%)
3. Commit and push

### Type Safety

```bash
npm run check          # TypeScript check
npm run lint          # ESLint + Prettier
npm run format        # Auto-format
```

---

## Validator Agent Rules

**MANDATORY: Run validator before claiming "ready"**

```
@agent maisonnettev2-validator
Validate my changes for production

Agent will:
✅ Run all E2E tests
✅ Verify 100% pass rate
✅ Block "ready" if any test fails
❌ Never accept "ready" on promise tests will pass
```

**If validator says ❌ NOT READY:**
1. Read the failure details
2. Fix the failing code
3. Rerun validator
4. Only claim "ready" when validator says ✅ PASS

---

## Common Issues

| Issue | Fix |
|-------|-----|
| `Error: Failed to fetch calendar` | Check GOOGLE_API_KEY is set in docker-compose.yml |
| Login form not found (element not found) | Ensure Caddy is proxying `/backoffice/login` correctly |
| `ENOENT: no such file or directory, open '.env'` | Run `./setup-env.sh` from root |
| Tests timeout | Increase Playwright timeout or reduce parallel browsers |
| Port 5173 already in use | Kill existing process: `lsof -ti:5173 \| xargs kill -9` |

---

## Security Checklist (2026-09-06 Update)

Backoffice authentication now follows security best practices:

- ✅ **JWT_SECRET** stored in `.env` (not hardcoded)
  - Each deployment gets unique random secret
  - Never appears in source code
  - Passed via docker-compose environment

- ✅ **Token storage** secure
  - Cookie with `SameSite=Strict` flag
  - No sensitive token data in console logs
  - Server-side validation on all protected routes

- ✅ **Logout implementation**
  - Page at `/backoffice/logout` clears all auth state
  - Backend clears cookie via `Set-Cookie` header
  - Frontend clears localStorage on logout

- ✅ **Protected endpoints**
  - All `/api/backoffice/meals/*` routes require auth
  - `/api/backoffice/meals/accounts` now protected (was public)
  - Middleware returns 401 for missing/invalid tokens

- ✅ **Testing**
  - E2E tests validate login → meals → logout flow
  - Token exposure in console checked
  - Cookie security flags verified

⚠️ **Before production deployment:**
1. Change `JWT_SECRET` in `.env` to new random value
2. Change `admin` password in database seed
3. Enable Caddy HTTPS (TLS cert)
4. Set `NODE_ENV=production`

---

## Deployment Checklist

- ✅ All E2E tests pass (validator says ✅)
- ✅ Docker images build without errors
- ✅ Environment variables set (JWT_SECRET, GOOGLE_API_KEY)
- ✅ Database migrations applied
- ✅ Caddy routes configured for production domain
- ✅ No hardcoded IPs or localhost URLs (all relative paths)
- ✅ Admin credentials changed from defaults
- ✅ TLS/HTTPS configured (Caddy handles it)

---

## References

- **Shared configs:** `/shared/eslint-config/`, `/shared/prettier-config/`
- **Validator agent:** `/shared/.claude/agents/maisonnettev2-validator.md`
- **ARCHITECTURE.md** — Detailed system design
- **PRACTICES.md** — Coding standards across all projects
- **GitHub Actions templates:** `.github/workflows/templates/`

---

**Updated:** 2026-09-05

⚠️ **Remember:** The validator agent is NOT optional. It prevents false "ready" claims.
