# maisonnettev2 — Démarrage rapide

Vous avez maintenant une architecture complète en place : `idp` (Authentik) + `maisonnettev2` (Frontend/Backend/DB).

## État actuel

**Phase A (idp)** ✅ Terminée
- Authentik self-hosted via Docker Compose
- PostgreSQL + Redis + Authentik server/worker
- Blueprints YAML pour Google/GitHub OAuth + Application maisonnettev2
- Prête pour déploiement local et production

**Phase B (maisonnettev2) — Démarrée**
- Prisma schema (Gite/Photo/Reservation)
- Docker Compose pour le stack complet (frontend/backend/DB)
- Routes API de base (`/health`, `/api/gites`)
- Swagger OpenAPI documentation (`/api/docs`)
- Documentation OIDC et local setup
- **Manque** : implémentation complète OIDC, pages React, Google Calendar sync, Stripe

## Démarrage en 5 minutes

### 1. Cloner/configurer idp

```bash
cd /Volumes/logousb/SSD/Projects/idp
cp .env.example .env
# Éditer .env, remplir PG_PASS, AUTHENTIK_SECRET_KEY, AUTHENTIK_BOOTSTRAP_PASSWORD
docker-compose up -d
# Attendre ~30s, vérifier: docker-compose ps (tous "healthy")
```

Admin UI: `http://localhost:9000/if/admin/` → admin@localhost / votre_password

### 2. Cloner/configurer maisonnettev2

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# Créer .env principal (pour docker-compose)
cat > .env <<'EOF'
DB_USER=maisonnettev2
DB_PASSWORD=dev_password_change_me
DB_NAME=maisonnettev2
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/
SENTRY_ENVIRONMENT=development
OWNER_EMAIL=contact@maisonnettev2.local
OWNER_PHONE=+33612345678
EOF

# Configurer backend/.env
cp backend/.env.example backend/.env
# Éditer backend/.env, s'assurer DATABASE_URL = postgresql://maisonnettev2:dev_password_change_me@postgres-maisonnettev2:5432/maisonnettev2

# Configurer frontend/.env.development
cp frontend/.env.example frontend/.env.development

# Installer dépendances
cd backend
npm install
cd ../frontend
npm install
cd ..

# Démarrer le stack
docker-compose up -d
docker-compose ps  # vérifier tous les services healthy
```

### 3. Tester

**Health check backend**:
```bash
curl http://localhost:3001/health
```
Réponse: `{"status":"healthy","database":"connected",...}`

**API docs**:
```bash
open http://localhost:3001/api/docs
```

**Frontend**:
```bash
open http://localhost:5173
```

## Prochaines étapes (Phase B.3+)

### Court terme (cette semaine)

1. **Implémenter OIDC frontend** (`src/auth/OIDCManager.ts` + pages de login)
   - Voir `docs/oidc-integration.md`
   
2. **Implémenter OIDC backend** (middleware JWT validation)
   - Voir `docs/oidc-integration.md`

3. **Créer pages de base** (Home, GiteDetail, Booking)
   - Utiliser Prisma pour charger les gîtes
   - Swagger déjà en place pour l'API

### Moyen terme (semaines 2-3)

4. **Google Calendar sync** (service account, réservations ↔ calendrier)
5. **Stripe integration** (PaymentIntent, webhooks)
6. **CI/CD** (GitHub Actions pour dev/staging/prod)

### Long terme (semaines 4+)

7. **Observabilité** (Sentry, logs structurés)
8. **Backups** (pgBackRest, RTO/RPO, tests de restauration)

## Architecture locale

```
http://localhost:9000          → Authentik (admin UI, OAuth endpoint)
http://localhost:3001          → maisonnettev2 API (Express)
http://localhost:5173          → maisonnettev2 Frontend (React)
http://localhost:5433          → PostgreSQL maisonnettev2
```

## Arrêter les services

```bash
# maisonnettev2
cd /Volumes/logousb/SSD/Projects/maisonnettev2
docker-compose down

# idp
cd /Volumes/logousb/SSD/Projects/idp
docker-compose down
```

## Troubleshooting

**Backend ne démarre pas ?**
```bash
cd maisonnettev2/backend
npm install
docker-compose up -d --build backend
```

**DB connection error ?**
```bash
docker-compose logs postgres-maisonnettev2
docker-compose exec postgres-maisonnettev2 pg_isready -U maisonnettev2
```

**Frontend ne peut pas joindre l'API ?**
```bash
curl -I http://localhost:3001/health
# Si 404, vérifier docker-compose logs backend
```

## Notes

- **Données** : PostgreSQL sur volumes nommés (dev local), à migrer vers Expansion12 pour la prod si besoin
- **Secrets** : `.env` gitignored, `.env.example` sans secrets
- **DB migration** : `cd backend && npm run prisma:migrate` pour appliquer les schémas Prisma
- **Audit** : `npm audit` avant chaque déploiement

Pour plus de détails, consulter `docs/local-setup.md` et `docs/oidc-integration.md`.
