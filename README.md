# maisonnettev2 — Gîte Rental Booking Platform

Full-stack SPA for gîte rental management with OIDC authentication (Authentik), Stripe payments, and Google Calendar integration.

## Project Status

**Phase B (In Progress)**
- [x] Prisma schema (Gite, Photo, Reservation models)
- [x] Docker Compose (frontend, backend, PostgreSQL)
- [x] Swagger/OpenAPI documentation
- [x] OIDC authentication (frontend: oidc-client-ts, backend: Jose JWKS validation)
- [x] Protected routes with JWT validation
- [x] Basic pages (Home, GiteDetail)
- [ ] Booking form & Stripe integration
- [ ] Google Calendar sync
- [ ] Healthchecks & error monitoring (Sentry)
- [ ] CI/CD (GitHub Actions for dev/staging/prod)

## Tech Stack

### Frontend
- **React 18** — UI framework
- **Vite** — build tooling
- **TypeScript** — type safety
- **Tailwind CSS** — styling
- **React Router** — navigation
- **@tanstack/react-query** — data fetching
- **oidc-client-ts** — OIDC/OAuth2 authentication
- **Axios** — HTTP client
- **Zod** — schema validation

### Backend
- **Node.js 20** — runtime
- **Express** — web framework
- **TypeScript** — type safety
- **Prisma** — ORM + migrations
- **PostgreSQL 16** — database
- **Jose** — JWT validation (JWKS)
- **Swagger** — API documentation
- **Stripe** — payments
- **@sentry/node** — error tracking

### Infrastructure
- **Docker Compose** — local development
- **Authentik** — centralized OIDC IdP

## Quick Start

```bash
# 1. Ensure Authentik is running
cd /Volumes/logousb/SSD/Projects/idp && docker-compose up -d

# 2. Configure environment
cd /Volumes/logousb/SSD/Projects/maisonnettev2
cp .env.example .env  # Configure docker-compose vars
cp backend/.env.example backend/.env  # Configure DATABASE_URL
cp frontend/.env.example frontend/.env.development

# 3. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 4. Start services
docker-compose up -d

# 5. Apply database migrations
cd backend && npm run prisma:migrate

# 6. Access services
open http://localhost:5173          # Frontend
open http://localhost:3001/api/docs # Swagger API docs
```

## Project Structure
```
maisonnettev2/
├── frontend/                       React SPA
│   ├── src/
│   │   ├── auth/OIDCManager.ts     OIDC configuration
│   │   ├── hooks/useAuth.ts        Auth state hook
│   │   ├── lib/api.ts              Axios + auth headers
│   │   └── pages/                  Home, GiteDetail, Callback
│   └── Dockerfile
├── backend/                        Express API
│   ├── src/
│   │   ├── middleware/oidc.ts      JWT validation
│   │   ├── routes/                 API endpoints
│   │   ├── swagger.ts              OpenAPI spec
│   │   └── index.ts                App entry
│   ├── prisma/schema.prisma        Database models
│   └── Dockerfile
├── docs/
│   ├── OIDC.md                     Authentication guide (start here!)
│   ├── oidc-complete-flow.md       End-to-end flow diagram
│   └── local-setup.md              Setup details
├── docker-compose.yml
├── QUICKSTART.md
└── README.md
```

## Authentication (OIDC)

**Read [docs/OIDC.md](./docs/OIDC.md) for complete documentation.**

Flow: Login → Authentik → Authorization Code → Token → API calls with JWT

- Frontend: React hook `useAuth()` with oidc-client-ts
- Backend: Middleware validates JWT via Authentik JWKS
- Auto-renewal: Tokens refresh 5 min before expiration
- PKCE: Enabled by default for SPAs

## Database Models

- **Gite**: Rental property
- **Photo**: Gallery (categories: EXTERIEUR, SALON, CUISINE, CHAMBRE, SDB, OUTDOOR)
- **Reservation**: Bookings with status (PENDING, CONFIRMED, CANCELLED)

## API Endpoints

**Public:**
- `GET /health` — health check
- `GET /api/gites` — list all gites
- `GET /api/gites/:slug` — gite details with photos

**Protected (JWT required):**
- `GET /api/reservations` — user's reservations
- `POST /api/reservations` — create reservation
- `GET /api/reservations/:id` — reservation details

**Full API docs:** http://localhost:3001/api/docs (Swagger UI)

## Development

### Logs & Debugging

```bash
# Backend logs
docker-compose logs backend -f

# Database
docker-compose exec postgres-maisonnettev2 psql -U maisonnettev2 -d maisonnettev2

# Frontend browser console
open http://localhost:5173 → F12 → Console

# Check OIDC status
localStorage.getItem('oidc.user:...')
```

### Common Commands

```bash
# Database migrations
cd backend && npm run prisma:migrate
cd backend && npm run prisma:studio  # Visual DB editor

# Type checking
cd frontend && npm run type-check
cd backend && npm run type-check

# Security audit
cd frontend && npm audit
cd backend && npm audit
```

## Next Steps

1. **Booking form** (Phase B.4) — DatePicker, confirm/cancel
2. **Stripe integration** (Phase B.6) — PaymentIntent, webhooks
3. **Google Calendar** (Phase B.5) — Service account sync
4. **CI/CD** (Phase C) — GitHub Actions for staging/prod
5. **Observability** (Phase D) — Sentry, structured logging, backups

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) — 5-minute setup
- [docs/OIDC.md](./docs/OIDC.md) — Authentication (start here for auth!)
- [docs/oidc-complete-flow.md](./docs/oidc-complete-flow.md) — End-to-end flow diagram
- [docs/local-setup.md](./docs/local-setup.md) — Detailed configuration
- [Docs/plan.md](./Docs/plan.md) — Full implementation roadmap

## Support

- Backend health: `curl http://localhost:3001/health`
- Frontend: http://localhost:5173
- API docs: http://localhost:3001/api/docs
- Logs: `docker-compose logs <service>`

## License

MIT
