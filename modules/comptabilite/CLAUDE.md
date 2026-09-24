# Comptabilite Module — SASU Accounting Automation

## Overview

**comptabilite** (formerly sasubilancomptable) automates SASU accounting:
- Extract invoices from Gmail → Parse PDF metadata
- Match invoices ↔ bank transactions (local, 1:1 only)
- Sync to Sage API (once credentials configured)

## Architecture

```
modules/comptabilite/
├── backend/        Express.js + Prisma + TypeScript
├── frontend/       SvelteKit pages under /comptabilite
└── prisma/         Schema + migrations for comptabilite tables
```

**Ports** (Docker):
- Backend: 3002 (routed via `/api/comptabilite/*`)
- Frontend: 8030 (routed via `/comptabilite/*`)

**Database**: Shared Postgres with parent maisonnettev2 (schema: `comptabilite`)

## Key Features

- 📊 **Invoice extraction**: Gmail → PDF parsing → metadata (date, amount, vendor)
- 🎯 **Matching UI**: Visualize computed invoice-transaction matches with confidence scores
- 1️⃣ **1:1 matching**: Greedy algorithm ensures each invoice and transaction pair only once
- 🔐 **Sage integration**: Ready for OAuth2 + REST API (credentials in Bitwarden)

## Environment Variables (from Bitwarden: logo-prod/sasubilancomptable-sage)

```
SAGE_CLIENT_ID=<client-id>
SAGE_CLIENT_SECRET=<client-secret>
SAGE_SUBSCRIPTION_KEY=<subscription-key-primary>
```

## API Endpoints (Protected — SSO Admin)

- `GET /api/admin/comptabilite/matches/compute` — Calculate matches for UI
- `GET /api/admin/comptabilite/invoices` — List all invoices
- `POST /api/admin/comptabilite/invoices/sync-gmail` — Sync Gmail → extract invoices
- `POST /api/admin/comptabilite/sync/match-pennylane` — Match invoices ↔ transactions (legacy)

## Frontend Routes (Protected — SSO Admin)

- `/admin/comptabilite` — Home
- `/admin/comptabilite/matches` — Visualize & validate computed matches
- `/admin/comptabilite/invoices` — Invoice list
- `/admin/comptabilite/transactions` — Transaction list

## Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm run test:e2e
```

## Integration Notes

- Shares Postgres schema `comptabilite` with parent maisonnettev2
- Migrations run as part of main maisonnettev2 deployment
- CI/CD triggered by `deploy-hetzner.yml` (inherited from parent)
- Auth: currently open (no auth required for comptabilite endpoints)
