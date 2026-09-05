# Implementation Summary — maisonnettev2 Phases A–B.4

**Date:** August 22, 2026  
**Status:** Phase B.4 Complete ✅  
**Next:** Phase B.5 (Google Calendar sync)

## Executive Summary

Two major projects initialized with complete foundational architecture:

1. **idp** (Authentik IDP) — Phase A ✅ COMPLETE
   - Self-hosted centralized identity provider for all personal projects
   - Docker Compose with PostgreSQL, Redis, Authentik server+worker
   - OIDC/OAuth2 sources (Google, GitHub) + maisonnettev2 application configured
   - Blueprint-based infrastructure as code (YAML)
   - Ready for local development and production VPS deployment

2. **maisonnettev2** (Gîte Rental Booking) — Phase B (50% complete)
   - Phase B.1: Prisma schema ✅
   - Phase B.2: Swagger/OpenAPI ✅
   - Phase B.3: OIDC authentication (frontend + backend) ✅
   - Phase B.4: React pages (Home, GiteDetail, Login) ✅
   - Phase B.5-B.8: Pending (Stripe, Google Calendar, CI/CD, observability)

## Detailed Accomplishments

### Phase A — Authentik IDP (Complete)

**Files Created:**
- `docker-compose.yml` — 4 services: PostgreSQL, Redis, Authentik server, Authentik worker
- `.env.example` — Configuration template with Google/GitHub OAuth placeholders
- `blueprints/sources/google-oauth.yaml` — Google OAuth source
- `blueprints/sources/github-oauth.yaml` — GitHub OAuth source
- `blueprints/projects/maisonnettev2.yaml` — OAuth2 provider + application for maisonnettev2
- `README.md` — Quick start guide
- `Docs/planv1.md` — Complete Phase A plan with security checklist

**Architecture:**
- PostgreSQL bind-mounted to `/Volumes/Expansion12/idp/postgres-data` (external HDD)
- Redis for caching + sessions
- Authentik server on port 9000 (HTTP, dev-only)
- Authentik worker for async tasks (email, blueprint sync)
- All services have healthchecks (pg_isready, redis-cli ping, HTTP endpoints)
- Credentials via environment variables (no secrets in git)

**Ready For:**
- Local development via Docker Compose
- Blueprint-based multi-project configuration
- Google/GitHub OAuth identity federation
- Production deployment via VPS (Traefik/Nginx + TLS to be added in Phase C)

### Phase B.1 — Prisma Schema (Complete)

**Files Created:**
- `backend/prisma/schema.prisma` — Three models:
  - **Gite**: id, slug (unique), nom, description, adresse, capacite, prixNuit, googleCalendarId
  - **Photo**: id, giteId, url, categorie (enum: EXTERIEUR/SALON/CUISINE/CHAMBRE/SDB/OUTDOOR), ordre, alt, with FK + cascade delete
  - **Reservation**: id, giteId, dateDebut, dateFin, statut (PENDING/CONFIRMED/CANCELLED), clientNom/Email/Phone, montantTotal, stripePaymentIntentId, googleCalendarEventId

**Design Notes:**
- Scalable to 2+ gîtes without rework
- Date conflict prevention at application level (Phase B.4 routes check overlaps)
- Indexes on slug, giteId, statut, date ranges for query performance
- Stripe + Google Calendar integration points already in schema

### Phase B.2 — Swagger/OpenAPI (Complete)

**Files Created:**
- `backend/src/swagger.ts` — Complete OpenAPI 3.0 spec with:
  - Base URLs (dev: localhost:3001, prod: api.maisonnettev2.local)
  - Component schemas (Gite, Photo, Reservation, Health)
  - Security schemes (bearerAuth: JWT)
  - Server-to-client API contract documentation

**Endpoints Documented:**
- `GET /health` — health check with DB connectivity
- `GET /api/gites` — list all gites with photos
- `GET /api/gites/{slug}` — gite details
- `GET /api/reservations` — user's reservations (protected)
- `POST /api/reservations` — create reservation with date conflict check (protected)
- `GET /api/reservations/{id}` — reservation details (protected)

**Live At:**
- http://localhost:3001/api/docs (Swagger UI with try-it-out)

### Phase B.3 — OIDC Authentication (Complete)

#### Frontend (React + oidc-client-ts)

**Files Created:**
- `frontend/src/auth/OIDCManager.ts` — UserManager configuration
  - Authority: http://localhost:9000/application/o/maisonnettev2/
  - Response type: code (Authorization Code flow)
  - PKCE enabled by default
  - Auto-renewal 5 min before token expiration
  - Silent renew via iframe
  
- `frontend/src/hooks/useAuth.ts` — React hook returning:
  - `user: User | null`
  - `isAuthenticated: boolean`
  - `isLoading: boolean`
  - `login()`, `logout()` functions

- `frontend/src/lib/api.ts` — Axios client with:
  - Automatic `Authorization: Bearer <token>` header injection
  - 401 error handling (logs warning for re-auth)
  - Base URL from VITE_API_URL env

- `frontend/src/pages/Callback.tsx` — OAuth redirect handler
  - Processes authorization code
  - Exchanges code for JWT
  - Stores token + user in localStorage
  - Redirects to home on success or login on error

- `frontend/public/silent-renew.html` — Token auto-renewal iframe endpoint

**Environment Variables:**
- VITE_AUTHENTIK_AUTHORITY
- VITE_AUTHENTIK_CLIENT_ID
- VITE_API_URL

#### Backend (Node.js + Jose)

**Files Created:**
- `backend/src/middleware/oidc.ts` — JWT validation middleware
  - Extracts Bearer token from Authorization header
  - Validates signature via Authentik JWKS (HTTP GET)
  - Decodes JWT claims
  - Attaches `req.user` with decoded payload (sub, email, name, etc.)
  - Returns 401 on invalid/expired token
  - JWKS cached in memory with automatic refresh

- `backend/src/routes/reservations.ts` — Protected endpoints
  - `GET /api/reservations` — list user's reservations (filtered by email)
  - `POST /api/reservations` — create reservation with:
    - Zod validation
    - Date conflict checking (overlapping reservations)
    - Night calculation + total price computation
    - Stratus set to PENDING (awaiting Stripe payment)
  - `GET /api/reservations/:id` — reservation details

**Security:**
- PKCE flow prevents authorization code interception
- JWT signature validated via public JWKS (no shared secret needed)
- Token expiration (exp claim) enforced by Jose
- Stateless: no token stored in backend (all claims in JWT)
- CORS restricted to frontend origin

#### Documentation

**Files Created:**
- `docs/OIDC.md` — Main entry point (quick start, troubleshooting)
- `docs/oidc-complete-flow.md` — End-to-end flow with ASCII diagrams
- `docs/oidc-frontend-implementation.md` — React/oidc-client-ts details
- `docs/oidc-backend-implementation.md` — Express/Jose validation details
- `docs/oidc-integration.md` — Original integration guide (reference)

### Phase B.4 — React Pages (Complete)

**Files Created:**
- `frontend/src/pages/Home.tsx` — Gites list
  - Fetches all gites via React Query
  - Responsive grid (1 col mobile, 2 md, 3 lg)
  - Photo thumbnail (first photo or placeholder)
  - Price per night + capacity
  - Links to GiteDetail

- `frontend/src/pages/GiteDetail.tsx` — Gite details
  - Dynamic route param: `/gite/:slug`
  - Fetches gite + photos via React Query
  - Photos grouped by category (EXTERIEUR, SALON, etc.)
  - Full description + address + price
  - Booking section:
    - If not authenticated: login button
    - If authenticated: "booking coming soon" placeholder
  - Responsive image gallery with hover effects

- `frontend/src/pages/Login.tsx` — Login page
  - Checks auth status, redirects if already authenticated
  - Login options: Email, Google, GitHub (all call `login()` which redirects to Authentik)
  - Styled with gradient background + card layout
  - Responsive + accessible

### Infrastructure & Configuration

**Docker Compose (maisonnettev2):**
- `postgres-maisonnettev2`: PostgreSQL 16, port 5433, bind-mount for data
- `backend`: Express, port 3001, depends_on postgres (service_healthy)
- `frontend`: React dev server, port 5173, depends_on backend

**Package.json Updates:**
- Frontend: Added oidc-client-ts, @sentry/react, react-day-picker, date-fns, ESLint, testing libs
- Backend: Added jose, removed bcryptjs + jsonwebtoken (unused with OIDC), added Stripe, Sentry

**Documentation:**
- `QUICKSTART.md` — 5-minute setup guide
- `README.md` — Complete project documentation with architecture, tech stack, next steps
- `docs/local-setup.md` — Detailed configuration guide with troubleshooting

## Current State — What Works

✅ **Both projects can run together locally:**
```bash
cd /Volumes/logousb/SSD/Projects/idp && docker-compose up -d
cd /Volumes/logousb/SSD/Projects/maisonnettev2 && docker-compose up -d
# idp: http://localhost:9000
# maisonnettev2 frontend: http://localhost:5173
# maisonnettev2 backend: http://localhost:3001
```

✅ **OIDC authentication end-to-end:**
- Frontend login redirects to Authentik
- User authenticates (email, Google, GitHub)
- Token stored in localStorage
- API calls include JWT header
- Backend validates token via JWKS

✅ **API endpoints functional:**
- GET /api/gites (public, returns all gites)
- GET /api/gites/:slug (public, gite + photos)
- GET /api/reservations (protected, returns user's reservations)
- POST /api/reservations (protected, creates with date conflict check)
- GET /health (public, checks DB connectivity)

✅ **React UI functional:**
- Home page displays gites in grid
- Click gite → GiteDetail page with photos + booking section
- Login/logout flow works
- Protected UI elements show/hide based on auth status

## Pending — What's Next

### Phase B.5 — Google Calendar Sync
- Service Account configuration (JSON key)
- Read gite availability from Google Calendar
- Write reservations to Google Calendar as events
- Bi-directional sync (calendar blocks prevent double-booking)

### Phase B.6 — Stripe Integration
- PaymentIntent flow on reservation confirm
- Webhook validation (raw body signature check)
- Update reservation status (PENDING → CONFIRMED on payment success)
- Refund handling (CONFIRMED → CANCELLED with refund)
- Stripe key rotation + PCI compliance

### Phase B.7 — Healthchecks & Security
- Endpoint `/health` enhanced to check Redis, Authentik connectivity
- Rate limiting on all routes (express-rate-limit)
- CORS finalized (whitelist env-based)
- CSP headers via Helmet (finalize after frontend stabilizes)
- Dépendencies audit (npm audit high)
- MFA enablement on Authentik admin (if using for production)

### Phase B.8 — README & Documentation
- Update README with Stripe, Google Calendar, CI/CD notes
- API contract documentation (POST /api/reservations body schema)
- Deployment checklist (security, testing, rollback)
- Troubleshooting guide expanded

### Phase C — CI/CD & Environments
- GitHub Actions workflows:
  - `ci.yml`: lint, type-check, security audit (npm audit + trivy images)
  - `deploy-staging.yml`: Build → SSH → docker-compose up -d
  - `deploy-prod.yml`: Manual trigger + approval gate + same deployment
- Three environment configs: dev (local), staging, prod
- Database migrations in CI/CD (prisma migrate deploy)
- Docker image tagging (commit SHA)
- SSH key management (GitHub secrets, per-environment)

### Phase D — Observability & Backups
- Sentry integration (@sentry/react + @sentry/node)
- Structured logging (pino JSON logger)
- Database backups (pgBackRest with RPO=24h, RTO=hours)
- Backup restoration test (monthly)
- Error rate alerts (if monitoring service deployed)
- Audit trail retention (Authentik logs + application logs)

## Git Tags

All work tagged with `checkpoint-20260822`:

```
idp:
- Initial Authentik setup with blueprints
- Git: https://github.com/loicgo29/idp.git
- Tag: checkpoint-20260822

maisonnettev2:
- B.1: Prisma schema
- B.2: Swagger + health endpoint
- B.3: OIDC (frontend + backend)
- B.4: React pages (Home, GiteDetail, Login)
- All phases: https://github.com/loicgo29/maisonnettev2.git
- Tag: checkpoint-20260822
```

## File Structure Summary

```
/Volumes/logousb/SSD/Projects/

idp/  (Phase A ✅ Complete)
├── docker-compose.yml
├── .env.example
├── README.md
├── blueprints/
│   ├── sources/google-oauth.yaml
│   ├── sources/github-oauth.yaml
│   └── projects/maisonnettev2.yaml
└── Docs/planv1.md

maisonnettev2/  (Phase B.4 ✅ Partial, B.5-D Pending)
├── frontend/
│   ├── src/
│   │   ├── auth/OIDCManager.ts
│   │   ├── hooks/useAuth.ts
│   │   ├── lib/api.ts
│   │   ├── pages/Home.tsx, GiteDetail.tsx, Login.tsx, Callback.tsx
│   │   └── components/
│   ├── public/silent-renew.html
│   ├── Dockerfile
│   └── package.json (with oidc-client-ts, Sentry, etc.)
├── backend/
│   ├── src/
│   │   ├── middleware/oidc.ts
│   │   ├── routes/gites.ts, reservations.ts, health.ts, contact.ts
│   │   ├── lib/prisma.ts
│   │   ├── swagger.ts
│   │   └── index.ts
│   ├── prisma/schema.prisma
│   ├── Dockerfile
│   └── package.json (with jose, Prisma, Stripe, etc.)
├── docs/
│   ├── OIDC.md (start here!)
│   ├── oidc-complete-flow.md
│   ├── oidc-frontend-implementation.md
│   ├── oidc-backend-implementation.md
│   ├── local-setup.md
│   └── oidc-integration.md
├── docker-compose.yml
├── QUICKSTART.md
├── README.md
└── IMPLEMENTATION_SUMMARY.md (this file)
```

## How to Proceed

### For Immediate Testing

```bash
# 1. Start idp
cd /Volumes/logousb/SSD/Projects/idp
docker-compose up -d

# 2. Configure maisonnettev2
cd /Volumes/logousb/SSD/Projects/maisonnettev2
cat > .env <<EOF
DB_USER=maisonnettev2
DB_PASSWORD=dev_password
DB_NAME=maisonnettev2
KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/
EOF

# 3. Install & start
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
docker-compose up -d

# 4. Apply migrations
cd backend && npm run prisma:migrate

# 5. Test
curl http://localhost:3001/health  # Should be healthy
open http://localhost:5173          # Frontend
```

### For Phase B.5+ Development

1. **Google Calendar** — Add service account JSON to secrets/, implement reservation → calendar write
2. **Stripe** — Add payment form to booking section, handle webhook on `/api/webhooks/stripe`
3. **CI/CD** — Copy workflow templates from NAS-logo-API, adapt for maisonnettev2
4. **Observability** — Initialize Sentry project, add error boundary in React, structured logging in Express

## Known Risks

- **Expansion12 volume:** Database currently binds to external HDD (Expansion12), which is scheduled for reformatting per HDD migration plan. **Action:** Migrate to persistent VPS storage before Expansion12 is wiped.
- **Colima resources:** 2 CPU / 6 GB RAM may be tight if running idp + maisonnettev2 + staging + other services. Monitor and upgrade if needed.
- **Production secrets:** All .env files gitignored, but ensure CI/CD GitHub Actions secrets are rotated regularly.

## Questions & Next Steps

**For the user:**
1. Should Phase B.5–B.8 proceed as planned (Google Calendar, Stripe, CI/CD, observability)?
2. When should VPS provisioning begin (Phase C prerequisite)?
3. Any changes to authentication sources (currently: email/password + Google + GitHub)?
4. Stripe: test keys or wait for production approval?

**Default next action:** Continue with Phase B.5 (Google Calendar sync) → B.6 (Stripe) → Phase C (CI/CD).

---

**Status:** ✅ Ready for Phase B.5  
**Committed:** ✅ All phases pushed to GitHub  
**Next Checkpoint:** Phase B.8 (Documentation complete, B.5-B.7 implemented)
