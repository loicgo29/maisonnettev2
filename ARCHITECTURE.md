# maisonnettev2 — Architecture & Structure

## 🎯 Projet

Gîte rental booking platform avec authentification centralisée (Authentik IDP).

## 📦 Structure du Projet

```
maisonnettev2/
├── backend/                    # Express API (TypeScript)
│   ├── src/
│   │   ├── index.ts           # Express app entry point
│   │   ├── swagger.ts         # OpenAPI/Swagger docs
│   │   ├── middleware/
│   │   │   ├── oidc.ts       # JWT validation (Authentik JWKS)
│   │   │   ├── error.ts       # Error handler
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── health.ts      # Health checks (/health, /live, /ready)
│   │   │   ├── gites.ts       # Gîte listings API
│   │   │   ├── reservations.ts # Reservation booking API
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── googleCalendar.ts # Google Calendar sync
│   │   │   └── ...
│   │   └── lib/
│   │       ├── prisma.ts      # Prisma singleton
│   │       └── monitoring.ts  # Sentry + Pino logging
│   ├── prisma/
│   │   └── schema.prisma      # Database schema (Gite, Photo, Reservation)
│   ├── features/              # Cucumber BDD scenarios
│   ├── package.json           # Dependencies (Express, Prisma, Jose, etc.)
│   ├── Dockerfile             # Docker build config
│   ├── .eslintrc.json        # ESLint config (TypeScript)
│   └── docker-compose.yml     # Local dev stack
│
├── frontend/                   # React SPA (TypeScript + Vite)
│   ├── src/
│   │   ├── main.tsx           # Vite entry point
│   │   ├── App.tsx            # Root component
│   │   ├── auth/
│   │   │   └── OIDCManager.ts # OIDC client (oidc-client-ts + PKCE)
│   │   ├── hooks/
│   │   │   └── useAuth.ts     # Auth state hook
│   │   ├── pages/
│   │   │   ├── Home.tsx       # Gîtes listing (grid)
│   │   │   ├── GiteDetail.tsx # Gîte detail + photo gallery
│   │   │   ├── Login.tsx      # Login page (email/Google/GitHub)
│   │   │   ├── Callback.tsx   # OIDC callback handler
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── api.ts         # Axios client (auto-adds JWT header)
│   │   └── components/        # Reusable React components
│   ├── tests/
│   │   ├── e2e/               # Playwright E2E tests
│   │   └── unit/              # Vitest unit tests
│   ├── public/
│   │   └── silent-renew.html  # OIDC token auto-renewal iframe
│   ├── package.json           # Dependencies (React, Vite, Playwright, Vitest)
│   ├── Dockerfile             # Docker build config
│   ├── .eslintrc.json        # ESLint config (React + TypeScript)
│   └── vitest.config.ts       # Unit test config
│
├── scripts/
│   ├── backup.sh              # Database backup (gzip + retention)
│   └── restore.sh             # Database restore + Prisma migrations
│
├── docs/
│   ├── OIDC.md               # Auth flow documentation
│   ├── TESTING.md            # Test strategy + commands
│   ├── CI-CD-SETUP.md        # GitHub Actions setup guide
│   ├── PHASE-B5-D.md         # Google Calendar + Sentry + Backups
│   ├── local-setup.md        # Local dev setup
│   └── ...
│
├── .github/workflows/
│   ├── ci.yml                # Lint + tests + audit
│   ├── deploy-staging.yml    # SSH deploy to staging
│   └── deploy-prod.yml       # SSH deploy to prod (manual approval)
│
├── docker-compose.yml         # Full stack (postgres, backend, frontend)
├── .env.example              # Environment variables template
├── .gitignore                # Ignore node_modules, .env, dist, etc.
├── package.json              # Root package (monorepo config if needed)
└── README.md                 # Project overview

```

## 🔐 Authentication Flow

1. **Frontend** opens http://localhost:5173
2. Clicks **Login** → redirects to `http://localhost:9000/application/o/maisonnettev2/`
3. Authentik shows login options: Email, Google, GitHub
4. User authenticates → Authentik redirects back to `http://localhost:5173/callback`
5. Frontend exchanges auth code for JWT token (PKCE flow)
6. Token stored in localStorage
7. All API requests include `Authorization: Bearer <JWT>` header
8. Backend validates JWT via Authentik JWKS endpoint
9. Request proceeds or returns 401 Unauthorized

## 💾 Database

**PostgreSQL 16** (Docker: `postgres-maisonnettev2`)

### Schema (Prisma):
- **Gite** — Properties (nom, slug, prixNuit, googleCalendarId)
- **Photo** — Images (giteId, url, categorie: SALON|CHAMBRE|etc)
- **Reservation** — Bookings (giteId, dateDebut, dateFin, statut: PENDING|CONFIRMED|CANCELLED)

```bash
# Migrations
npm run prisma:migrate      # Create new migration
npx prisma migrate deploy   # Apply migrations
npx prisma studio          # GUI browser for database
```

## 🚀 Services

| Service | Port | Health Check | Notes |
|---------|------|--------------|-------|
| **Authentik** | 9000 | `http://localhost:9000/-/health/live/` | IDP, OAuth2/OIDC provider |
| **Backend** | 3001 | `http://localhost:3001/health` | Express API |
| **Frontend** | 5173 | `http://localhost:5173` | Vite dev server |
| **PostgreSQL** | 5433 | — | Database |

## 📝 Key Files to Know

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Express app setup, middleware registration |
| `backend/src/middleware/oidc.ts` | JWT validation middleware |
| `frontend/src/auth/OIDCManager.ts` | OIDC client configuration (PKCE) |
| `frontend/src/lib/api.ts` | Axios client with auth header auto-injection |
| `backend/prisma/schema.prisma` | Database schema (source of truth) |
| `backend/src/swagger.ts` | OpenAPI spec auto-generated |
| `.env.example` | All required env variables |
| `docker-compose.yml` | Local dev stack definition |

## 🧪 Testing

```bash
# Backend
npm run test              # Vitest unit tests
npm run test:bdd         # Cucumber BDD (needs DB)
npm run lint             # ESLint (TypeScript)
npm run type-check       # tsc --noEmit

# Frontend
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run lint             # ESLint (React + TypeScript)
npm run type-check       # tsc --noEmit
```

## 🐳 Docker Compose

```bash
docker-compose up -d              # Start all services
docker-compose ps                 # Check status
docker-compose logs -f backend    # Tail backend logs
docker-compose down               # Stop all services
```

## 📦 Dependencies Summary

**Backend:**
- `express` — HTTP server
- `@prisma/client` — ORM
- `jose` — JWT validation
- `@sentry/node` — Error tracking
- `pino` — Structured logging
- `swagger-ui-express` — Docs UI

**Frontend:**
- `react`, `react-router-dom` — UI framework
- `oidc-client-ts` — OIDC/OAuth2 client (PKCE)
- `@tanstack/react-query` — Data fetching
- `@sentry/react` — Error tracking
- `@testing-library/react` — Component testing
- `vitest` — Unit testing
- `playwright` — E2E testing

## ⚡ Quick Start

```bash
# Terminal 1: Database + Authentik
cd /Volumes/logousb/SSD/Projects/idp
docker-compose up -d

# Terminal 2: Backend
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npm install
npm run dev

# Terminal 3: Frontend
cd /Volumes/logousb/SSD/Projects/maisonnettev2/frontend
npm install
npm run dev

# Open browser
http://localhost:5173
```

## 🔗 Related Projects

- **IDP (Authentik)** — `/Volumes/logousb/SSD/Projects/idp/`
  - Self-hosted OAuth2/OIDC provider
  - Serves all projects (maisonnettev2, future apps)

- **NAS-logo ecosystem** — `/Volumes/logousb/SSD/Projects/`
  - Multi-project orchestration
  - See CLAUDE.md for full ecosystem diagram

---

**Last Updated:** 2026-08-22
**Status:** Phases A-D complete (IDPsetup, Backend, Frontend, Tests, Monitoring, Backups)
