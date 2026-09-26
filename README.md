# maisonnettev2 — Plateforme de Réservation de Gîte

**Loïc's flagship project** — Plateforme SaaS pour gestion de gîte (réservations, comptabilité, calendrier) avec authentification Keycloak, protection OAuth2, intégration Sage & Google Calendar.

---

## 🎯 Statut du Projet

**Production** ✅
- Déploiement live sur Hetzner
- Authentification Keycloak + OAuth2-Proxy (routes `/admin` protégées)
- Réservations, paiements Stripe
- Comptabilité (ALO) et gestion SASU
- Synchronisation Google Calendar
- Surveillance Hetzner

---

## 🏗️ Architecture

```
Frontend (SvelteKit)          Backend (Express)           IDP
  ↓                              ↓                         ↓
:5173 (local/dev)            :3001 (API)            Keycloak :8080
  ↓                              ↓                         ↑
  └─ Caddy (:8030/prod) ◄────────┴─────────────────────────┘
      ├─ Reverse proxy
      ├─ Forward_auth oauth2-proxy:4180
      └─ TLS termination (Let's Encrypt prod)
```

**Services:**
- **Frontend** (SvelteKit, TypeScript) — Backoffice réservations + public site
- **Backend** (Express, TypeScript) — API reservations, photos, calendrier
- **ALO Backend** (Python FastAPI) — Comptabilité familiale
- **ALO Frontend** (React) — UI comptabilité
- **Comptabilité Frontend** (SvelteKit) — Gestion SASU
- **Keycloak** (OIDC/OAuth2) — Authentification centralisée
- **oauth2-proxy** (middleware) — Protection routes `/admin`
- **Caddy** (reverse proxy) — TLS, routing, auth forwarding
- **PostgreSQL** — Database unique (schémas séparés)

---

## 🚀 Démarrage Rapide

### Prérequis
```bash
# Charger les secrets depuis Bitwarden
cd /Volumes/logousb/SSD/Projects
./scriptslogo/setup/setup-env.sh
```

### Local Development

**Terminal 1 — Frontend**
```bash
cd maisonnettev2/frontend
npm install
npm run dev
# http://localhost:5173
```

**Terminal 2 — Backend**
```bash
cd maisonnettev2/backend
npm install
npm run dev
# http://localhost:3001/health
```

**Terminal 3 — Docker Services** (Caddy, oauth2-proxy, Keycloak, PostgreSQL)
```bash
cd maisonnettev2
docker-compose up -d
# Accès via Caddy: http://localhost:8030
```

### Production (Hetzner)

```bash
ssh hetzner
cd /opt/maisonnettev2
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier la santé
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

---

## 🔐 Authentification OAuth2 / Keycloak

**Routes protégées (/admin)** :
- `/admin` — Backoffice (réservations, messages)
- `/admin/alo` — Comptabilité familiale (ALO)
- `/admin/comptabilite` — Gestion SASU

**Flux :**
```
User → GET /admin/alo (no token)
  ↓
Caddy forward_auth → oauth2-proxy
  ↓ (401 Unauthorized)
User → GET /oauth2/start?rd=/admin/alo
  ↓
oauth2-proxy redirige vers Keycloak
  ↓
User se connecte (Keycloak)
  ↓
Retour à /admin/alo avec token valide
  ↓
Accès autorisé ✅
```

**Documentation complète :** Voir `OAUTH2_DEV.md` et `AUTH_WORKFLOW.md`

---

## 📊 Structure du Projet

```
maisonnettev2/
├── backend/                    Express API
│   ├── src/
│   │   ├── routes/            Endpoints
│   │   ├── services/          Logique métier
│   │   ├── middleware/        Auth, error handling
│   │   └── index.ts
│   ├── prisma/schema.prisma   Schéma DB
│   └── Dockerfile
├── frontend/                   SvelteKit backoffice
│   ├── src/routes/            Pages (réservations, etc.)
│   ├── src/lib/               Composants, API client
│   └── Dockerfile
├── alo-backend/               Comptabilité (Python FastAPI)
├── alo-frontend/              Comptabilité UI (React)
├── comptabilite-frontend/      SASU UI (SvelteKit)
├── caddy/
│   ├── Caddyfile              Local (dev)
│   └── Caddyfile.hetzner      Prod (Hetzner)
├── docker-compose.yml         Local development
├── docker-compose.prod.yml    Hetzner deployment
├── scripts/
│   ├── get-keycloak-token.sh  Obtenir token OAuth2
│   ├── test-oauth2-routes.sh  Test automatisé routes
│   └── rebuild-frontend.sh    Rebuild rapide SvelteKit
├── CLAUDE.md                  Project instructions (local)
├── ARCHITECTURE.md            Vue système détaillée
├── OAUTH2_DEV.md              Dev avec OAuth2 + Keycloak
├── AUTH_WORKFLOW.md           Flux d'authentification
├── DEPLOYMENT.md              Guide déploiement prod
├── INFRASTRUCTURE.md          Infra Hetzner/Caddy
└── README.md                  ← Tu es ici
```

---

## 🛠️ Développement

### Commandes Essentielles

```bash
# Frontend
cd frontend
npm run dev          # Dev server (hot reload)
npm run build        # Build optimisé
npm run check        # Type checking + linting
npm run format       # Auto-format code

# Backend
cd backend
npm run dev          # Dev server (auto-reload)
npm run prisma:migrate dev   # Migrations
npm run prisma:studio        # Visual DB editor

# Docker
docker-compose up -d         # Start all local services
docker-compose logs -f       # Follow logs
docker ps                    # Check running containers

# Tests
SKIP_WEBSERVER=1 npm run test:e2e  # Playwright E2E

# OAuth2 Testing (local)
./scripts/get-keycloak-token.sh logo-back <password>
./scripts/test-oauth2-routes.sh http://localhost:8030
```

### Database

**Local:**
```bash
# Port : 5432 (interne docker) / 5433 (localhost)
psql -h localhost -p 5433 -U maisonnettev2 -d maisonnettev2

# Voir les schémas
\dn

# ALO schema
SELECT * FROM alo.transactions LIMIT 10;

# Maisonnettev2 schema
SELECT * FROM public.gites LIMIT 10;
```

**Production (Hetzner):**
```bash
ssh hetzner
docker exec maisonnette-postgres psql -U maisonnettev2 -d maisonnettev2
```

### Debugging

```bash
# Logs backend
docker-compose logs backend -f

# Logs frontend (browser console)
open http://localhost:5173 → F12 → Console

# Logs Keycloak
docker-compose logs keycloak -f

# Logs oauth2-proxy
docker-compose logs oauth2-proxy -f

# Logs Caddy
docker-compose logs caddy -f

# Check token validity
./scripts/get-keycloak-token.sh logo-back <password> | base64 -d | jq .
```

---

## 🌐 Routes Principales

### Public (pas d'auth requise)
- `GET /` — Homepage
- `GET /api/gites` — Liste gîtes
- `GET /api/calendar/public` — Calendrier disponibilité

### Protégées (OAuth2/Keycloak)
- `GET /admin` — Backoffice (réservations)
- `GET /admin/alo` — Comptabilité familiale
- `GET /admin/comptabilite` — Gestion SASU

### Admin Backend
- `POST /api/backoffice/auth/login` — Login (local dev)
- `GET /api/backoffice/meals` — Meals API
- etc.

**Full API docs :** `http://localhost:3001/api/docs` (Swagger)

---

## 🔧 Stack Technique

### Frontend
- **SvelteKit** — Meta-framework TypeScript
- **Vite** — Build tool
- **TailwindCSS** — Styling
- **Playwright** — E2E tests

### Backend
- **Express** — Web framework
- **Prisma** — ORM
- **TypeScript** — Type safety
- **Swagger** — API docs

### Infrastructure
- **Keycloak 26** — OIDC IdP
- **oauth2-proxy v7.6** — Auth middleware
- **Caddy** — Reverse proxy + TLS
- **PostgreSQL 16** — Database
- **Docker Compose** — Orchestration
- **Hetzner** — Prod hosting

### Modules additionnels
- **ALO** (Comptabilité) — Python FastAPI backend + React frontend
- **Comptabilité** (SASU) — SvelteKit frontend
- **Sage Integration** — Sync Sage API
- **Google Calendar** — Sync calendrier

---

## 📚 Documentation Par Sujet

| Besoin | Fichier |
|--------|---------|
| **Authentification OAuth2 / Keycloak** | `OAUTH2_DEV.md` + `AUTH_WORKFLOW.md` |
| **Déploiement production** | `DEPLOYMENT.md` |
| **Infrastructure Hetzner** | `INFRASTRUCTURE.md` |
| **Architecture système** | `ARCHITECTURE.md` |
| **Instructions projet (local)** | `CLAUDE.md` |
| **ALO (comptabilité)** | `alo-backend/CLAUDE.md` |
| **Tests automatisés OAuth2** | `OAUTH2_DEV.md` (section "Testing Automatisé") |

---

## 🚀 Déploiement

**Branch workflow** (depuis 2026-09-21) :
1. `git checkout -b feat/xxx`
2. Commit + push sur feature branch
3. `gh pr create` + wait for CI ✅
4. Merge vers `main`
5. CI auto-déploie sur Hetzner

**Checklist pré-deploy :**
```bash
npm run check          # Type check
npm run lint          # ESLint + Prettier
npm run test:e2e      # E2E tests (Playwright)
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

**Post-deploy :**
```bash
# Tester les routes protégées
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr

# Vérifier la santé
curl https://maisonnette-pecheur-bertheaume.fr/health
```

---

## ⚙️ Configuration

### Variables d'Environnement

**Charger depuis Bitwarden :**
```bash
./scriptslogo/setup/setup-env.sh         # Dev
./scriptslogo/setup/setup-env.sh --prod  # Prod (Hetzner)
```

**Clés principales :**
- `OAUTH2_CLIENT_ID` — Keycloak client
- `OAUTH2_CLIENT_SECRET` — Keycloak secret
- `OAUTH2_COOKIE_SECRET` — Cookie signing
- `DB_PASSWORD` — PostgreSQL password
- `JWT_SECRET` — Backend JWT signing
- `SAGE_CLIENT_ID`, `SAGE_CLIENT_SECRET` — Sage API
- `GOOGLE_API_KEY` — Google Calendar

Voir `.env.example` pour la liste complète.

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| "Port already in use" | `lsof -ti:5173 \| xargs kill -9` |
| OAuth2 401 unauthorized | Vérifier OAUTH2_CLIENT_SECRET, Keycloak healthcheck |
| Database connection refused | Vérifier PostgreSQL healthcheck, DB_PASSWORD |
| Frontend build timeout | Utiliser `./scripts/rebuild-frontend.sh` (3 min) au lieu de `docker-compose up --build` (30 min) |
| 502 Bad Gateway | Vérifier service health : `docker-compose ps` |

---

## 📞 Support

- **Keycloak Admin :** https://auth.maisonnette-pecheur-bertheaume.fr/admin
- **Backend Swagger :** `http://localhost:3001/api/docs`
- **Frontend :** `http://localhost:5173` (dev) ou `https://maisonnette-pecheur-bertheaume.fr` (prod)
- **Database :** `psql -h localhost -p 5433 -U maisonnettev2 -d maisonnettev2`

---

## 📄 License

MIT
