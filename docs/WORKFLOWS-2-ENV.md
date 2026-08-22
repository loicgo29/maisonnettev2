# Phase C — CI/CD avec 2 Environnements (Staging + Prod)

Simplifié : dev local + staging (VPS) + prod (VPS)

## Architecture Simplifiée

```
git push → ci.yml (tests) → ✅ Tests OK
                              ↓
                        Manual Workflow:
                        • Staging Deploy (workflow_dispatch)
                        • Prod Deploy (workflow_dispatch + approval)
```

## GitHub Secrets (2 env)

**Staging:**
- `STAGING_SSH_KEY` — Private SSH key
- `STAGING_SSH_HOST` — VPS IP/hostname
- `STAGING_SSH_USER` — `deploy`
- `STAGING_DATABASE_URL` — `postgresql://user:pass@localhost:5432/maisonnettev2_staging`

**Production:**
- `PROD_SSH_KEY` — Private SSH key (peut être différent)
- `PROD_SSH_HOST` — VPS IP/hostname (peut être le même VPS, différent port/user)
- `PROD_SSH_USER` — `deploy`
- `PROD_DATABASE_URL` — `postgresql://user:pass@localhost:5432/maisonnettev2_prod`

## Fichier : ci.yml (Sans déploiement auto)

Créer `.github/workflows/ci.yml` :

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - run: cd frontend && npm ci
      - run: cd frontend && npm run type-check
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run test -- --coverage

      - run: cd frontend && npx playwright install --with-deps
      - run: cd frontend && npm run test:e2e

  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: maisonnettev2_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - run: cd backend && npm ci
      - run: cd backend && npm run type-check
      - run: cd backend && npm run lint
      - run: cd backend && npm run test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/maisonnettev2_test

      - run: cd backend && npm run test:bdd
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/maisonnettev2_test

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: cd frontend && npm audit --audit-level=moderate || true
      - run: cd backend && npm audit --audit-level=moderate || true
```

## Fichier : deploy-staging.yml

Créer `.github/workflows/deploy-staging.yml` :

```yaml
name: Deploy to Staging

on:
  workflow_dispatch

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.maisonnettev2.local

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_SSH_HOST }}
          username: ${{ secrets.STAGING_SSH_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            set -e
            
            cd /home/deploy/maisonnettev2
            
            # Pull latest code
            git fetch origin main
            git checkout origin/main
            
            # Create .env
            cat > .env <<'ENVEOF'
            NODE_ENV=staging
            PORT=3001
            DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }}
            VITE_API_URL=https://api.staging.maisonnettev2.local
            KEYCLOAK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            ENVEOF
            
            # Backend config
            mkdir -p backend/secrets
            cat > backend/.env <<'ENVEOF'
            NODE_ENV=staging
            PORT=3001
            DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }}
            KEYCLOAK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            SENTRY_DSN=${{ secrets.STAGING_SENTRY_DSN }}
            SENTRY_ENVIRONMENT=staging
            ENVEOF
            
            # Frontend config
            mkdir -p frontend/secrets
            cat > frontend/.env.production <<'ENVEOF'
            VITE_API_URL=https://api.staging.maisonnettev2.local
            VITE_AUTHENTIK_AUTHORITY=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
            ENVEOF
            
            # Deploy
            docker-compose -p maisonnettev2-staging down || true
            docker-compose -f docker-compose.yml -p maisonnettev2-staging pull
            docker-compose -f docker-compose.yml -p maisonnettev2-staging up -d
            
            # Wait for services
            sleep 10
            
            # Migrate database
            docker-compose -f docker-compose.yml -p maisonnettev2-staging exec -T postgres-maisonnettev2 pg_isready -U maisonnettev2 -d maisonnettev2
            docker-compose -f docker-compose.yml -p maisonnettev2-staging exec -T backend npx prisma migrate deploy || true
            
            # Health check
            sleep 5
            docker-compose -f docker-compose.yml -p maisonnettev2-staging exec -T backend curl -f http://localhost:3001/health || exit 1
            
            echo "✅ Staging deployment successful"
```

## Fichier : deploy-prod.yml

Créer `.github/workflows/deploy-prod.yml` :

```yaml
name: Deploy to Production

on:
  workflow_dispatch

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.maisonnettev2.local

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SSH_HOST }}
          username: ${{ secrets.PROD_SSH_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            set -e
            
            cd /home/deploy/maisonnettev2
            
            # Backup database
            mkdir -p backups
            BACKUP_FILE="backups/maisonnettev2-prod-$(date +%Y%m%d-%H%M%S).sql"
            docker-compose exec -T postgres-maisonnettev2 pg_dump -U maisonnettev2 maisonnettev2_prod > "$BACKUP_FILE" || echo "Backup failed (DB might be down)"
            
            # Pull latest code
            git fetch origin main
            git checkout origin/main
            
            # Create .env
            cat > .env <<'ENVEOF'
            NODE_ENV=production
            PORT=3002
            DATABASE_URL=${{ secrets.PROD_DATABASE_URL }}
            VITE_API_URL=https://api.maisonnettev2.local
            KEYCLOAK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            ENVEOF
            
            # Backend config
            mkdir -p backend/secrets
            cat > backend/.env <<'ENVEOF'
            NODE_ENV=production
            PORT=3002
            DATABASE_URL=${{ secrets.PROD_DATABASE_URL }}
            KEYCLOAK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            STRIPE_SECRET_KEY=${{ secrets.PROD_STRIPE_SECRET_KEY }}
            SENTRY_DSN=${{ secrets.PROD_SENTRY_DSN }}
            SENTRY_ENVIRONMENT=production
            ENVEOF
            
            # Frontend config
            mkdir -p frontend/secrets
            cat > frontend/.env.production <<'ENVEOF'
            VITE_API_URL=https://api.maisonnettev2.local
            VITE_AUTHENTIK_AUTHORITY=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
            ENVEOF
            
            # Deploy
            docker-compose -p maisonnettev2-prod down || true
            docker-compose -f docker-compose.yml -p maisonnettev2-prod pull
            docker-compose -f docker-compose.yml -p maisonnettev2-prod up -d
            
            # Wait for services
            sleep 10
            
            # Migrate database
            docker-compose -f docker-compose.yml -p maisonnettev2-prod exec -T postgres-maisonnettev2 pg_isready -U maisonnettev2 -d maisonnettev2_prod
            docker-compose -f docker-compose.yml -p maisonnettev2-prod exec -T backend npx prisma migrate deploy || true
            
            # Health check
            sleep 5
            docker-compose -f docker-compose.yml -p maisonnettev2-prod exec -T backend curl -f http://localhost:3002/health || exit 1
            
            echo "✅ Production deployment successful"
```

## Setup VPS (Même VPS pour staging + prod)

```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Setup directories
mkdir -p /home/deploy/maisonnettev2
mkdir -p /home/deploy/maisonnettev2/backups

# Clone repo (first time)
cd /home/deploy/maisonnettev2
git clone https://github.com/loicgo29/maisonnettev2.git .
```

## Caddy Config (Reverse Proxy)

Sur VPS, ajouter au Caddyfile :

```caddyfile
# Staging (port 3001)
api.staging.maisonnettev2.local {
    reverse_proxy localhost:3001
}

# Production (port 3002)
api.maisonnettev2.local {
    reverse_proxy localhost:3002
}

# Frontend (si aussi hébergé)
staging.maisonnettev2.local {
    reverse_proxy localhost:5173
}

maisonnettev2.local {
    reverse_proxy localhost:5174
}
```

Redémarrer Caddy :
```bash
sudo systemctl restart caddy
```

## Setup Secrets GitHub

```bash
# From your local machine
gh auth login  # if needed

gh secret set STAGING_SSH_KEY < ~/.ssh/deploy_key
gh secret set STAGING_SSH_HOST -b "your-vps-ip-or-domain"
gh secret set STAGING_SSH_USER -b "deploy"
gh secret set STAGING_DATABASE_URL -b "postgresql://staging_user:pass@localhost:5432/maisonnettev2_staging"
gh secret set STAGING_SENTRY_DSN -b "https://...@sentry.io/..." || true

gh secret set PROD_SSH_KEY < ~/.ssh/deploy_key
gh secret set PROD_SSH_HOST -b "your-vps-ip-or-domain"
gh secret set PROD_SSH_USER -b "deploy"
gh secret set PROD_DATABASE_URL -b "postgresql://prod_user:secure_pass@localhost:5432/maisonnettev2_prod"
gh secret set PROD_STRIPE_SECRET_KEY -b "sk_live_..." || true
gh secret set PROD_SENTRY_DSN -b "https://...@sentry.io/..." || true
```

## Déploiement

### 1. Tests (Automatique)

```bash
git push origin main
# Regarde Actions → CI → tous les tests doivent passer
```

### 2. Déployer en Staging (Manuel)

```
GitHub → Actions → Deploy to Staging → Run workflow → main
```

Attend quelques minutes...

Vérifie : `curl https://api.staging.maisonnettev2.local/health`

### 3. Déployer en Prod (Manuel + Approval)

```
GitHub → Actions → Deploy to Production → Run workflow → main
# Attend l'approbation (si branche protection activée)
Approuve
```

Vérifie : `curl https://api.maisonnettev2.local/health`

## Rollback Procedure

Si déploiement prod échoue :

```bash
ssh deploy@vps
cd /home/deploy/maisonnettev2

# Voir les backups
ls -la backups/

# Restore
psql -U prod_user -d maisonnettev2_prod < backups/maisonnettev2-prod-20260823-143000.sql

# Restart
docker-compose -p maisonnettev2-prod restart backend
```

## Checklist Déploiement

- [ ] Tous les tests passent (Actions → CI)
- [ ] Code pushé sur main
- [ ] Secrets GitHub configurés
- [ ] SSH keys déployées sur VPS
- [ ] Docker + Caddy sur VPS
- [ ] Base de données créées (staging + prod)
- [ ] Déployer staging, tester
- [ ] Déployer prod, tester
- [ ] Backups en place
