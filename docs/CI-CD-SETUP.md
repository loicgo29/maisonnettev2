# Phase C — CI/CD Setup Guide

Complete continuous integration & deployment pipeline for dev/staging/prod environments.

## Architecture

```
┌─────────────────┐
│  GitHub Push    │
└────────┬────────┘
         │
         ▼
    ┌─────────────────────────────────┐
    │  .github/workflows/ci.yml       │
    │  (lint, type-check, test, audit)│
    └────────┬────────────────────────┘
             │
             ├──→ ✅ Tests Pass
             │
             ▼
    ┌─────────────────────────────────┐
    │ develop branch? → staging deploy │  (Auto)
    │ main branch?    → prod approval  │  (Manual)
    └─────────────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ SSH to VPS                      │
    │ Pull Docker images              │
    │ docker-compose up -d            │
    │ prisma migrate deploy           │
    └─────────────────────────────────┘
```

## Setup Requirements

### 1. VPS Provisioning (Manual)

```bash
# On VPS (e.g., DigitalOcean, Linode, AWS)
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deploy user (non-root)
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Create project directory
sudo mkdir -p /home/deploy/maisonnettev2
sudo chown deploy:deploy /home/deploy/maisonnettev2

# Test Docker
su - deploy
docker ps  # Should work without sudo
```

### 2. SSH Key Setup

```bash
# On your local machine
ssh-keygen -t ed25519 -f ~/.ssh/deploy_maisonnettev2 -N ""

# Copy to VPS
ssh-copy-id -i ~/.ssh/deploy_maisonnettev2 deploy@your-vps-ip

# Test connection
ssh -i ~/.ssh/deploy_maisonnettev2 deploy@your-vps-ip

# Add to GitHub Secrets
# Repo → Settings → Secrets and variables → Actions
# New secret: STAGING_SSH_KEY (or PROD_SSH_KEY)
# Value: cat ~/.ssh/deploy_maisonnettev2 (content, not public key)
```

### 3. GitHub Secrets Configuration

**For Staging:**
- `STAGING_SSH_KEY` — Private SSH key
- `STAGING_SSH_HOST` — VPS IP/domain
- `STAGING_SSH_USER` — `deploy` (or your username)
- `STAGING_DATABASE_URL` — PostgreSQL connection string (on VPS)

**For Production:**
- `PROD_SSH_KEY` — Private SSH key
- `PROD_SSH_HOST` — VPS IP/domain
- `PROD_SSH_USER` — `deploy`
- `PROD_DATABASE_URL` — PostgreSQL connection string (on VPS)

**Go to:** Repo → Settings → Secrets and variables → Actions → New repository secret

### 4. Docker Registry (Optional)

For faster deployments, push images to Docker Hub or private registry:

```bash
# GitHub Secrets
DOCKER_REGISTRY_USERNAME=your-username
DOCKER_REGISTRY_PASSWORD=your-pat-token  # Personal Access Token
DOCKER_REGISTRY_URL=docker.io
```

## Workflow Files

Create these files in `.github/workflows/`:

### 1. ci.yml (Build & Test)

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

      - uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend

      - run: cd frontend && npx playwright install --with-deps
      - run: cd frontend && npm run test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/test-results/

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

      - uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json
          flags: backend

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

      - run: cd frontend && npm audit --audit-level=moderate
        continue-on-error: true
      - run: cd backend && npm audit --audit-level=moderate
        continue-on-error: true
```

### 2. deploy-staging.yml (Auto-deploy)

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.maisonnettev2.local

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_SSH_HOST }}
          username: ${{ secrets.STAGING_SSH_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /home/deploy/maisonnettev2
            git fetch origin develop
            git checkout origin/develop
            
            # Update docker-compose
            cat > .env.staging <<EOF
            NODE_ENV=staging
            DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }}
            VITE_API_URL=https://api.staging.maisonnettev2.local
            AUTHENTIK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            EOF
            
            # Deploy
            docker-compose -f docker-compose.yml --project-name maisonnettev2-staging pull
            docker-compose -f docker-compose.yml --project-name maisonnettev2-staging up -d
            
            # Migrate database
            docker-compose -f docker-compose.yml --project-name maisonnettev2-staging exec -T postgres-maisonnettev2 pg_isready -U maisonnettev2
            docker-compose -f docker-compose.yml --project-name maisonnettev2-staging exec -T backend npx prisma migrate deploy || true
            
            echo "✅ Staging deployed successfully"
```

### 3. deploy-prod.yml (Manual + Approval)

```yaml
name: Deploy to Production

on:
  workflow_dispatch

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://maisonnettev2.local
    
    # This requires GitHub branch protection rules + required reviewer
    # Settings → Branches → Add rule → Require approval for production

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SSH_HOST }}
          username: ${{ secrets.PROD_SSH_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /home/deploy/maisonnettev2
            git fetch origin main
            git checkout origin/main
            
            # Update docker-compose
            cat > .env.production <<EOF
            NODE_ENV=production
            DATABASE_URL=${{ secrets.PROD_DATABASE_URL }}
            VITE_API_URL=https://api.maisonnettev2.local
            AUTHENTIK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
            STRIPE_SECRET_KEY=${{ secrets.PROD_STRIPE_SECRET_KEY }}
            SENTRY_DSN=${{ secrets.PROD_SENTRY_DSN }}
            EOF
            
            # Create backup before deploy
            docker-compose exec -T postgres-maisonnettev2 pg_dump -U maisonnettev2 maisonnettev2 > /home/deploy/backups/maisonnettev2-$(date +%Y%m%d-%H%M%S).sql || true
            
            # Deploy
            docker-compose -f docker-compose.yml --project-name maisonnettev2-prod pull
            docker-compose -f docker-compose.yml --project-name maisonnettev2-prod up -d
            
            # Migrate database
            docker-compose -f docker-compose.yml --project-name maisonnettev2-prod exec -T backend npx prisma migrate deploy || true
            
            # Health check
            sleep 5
            curl -f https://api.maisonnettev2.local/health || exit 1
            
            echo "✅ Production deployed successfully"
```

## Environment Configuration

### Staging Environment

**VPS Setup:**
```bash
# On VPS
ssh deploy@your-vps-ip

# Create directories
mkdir -p /home/deploy/maisonnettev2
mkdir -p /home/deploy/maisonnettev2/postgres-data-staging
mkdir -p /home/deploy/backups

# Create docker-compose.staging.yml (or use shared .env files)
```

**.env.staging (created by CI/CD):**
```
NODE_ENV=staging
DATABASE_URL=postgresql://staging_user:password@localhost:5432/maisonnettev2_staging
VITE_API_URL=https://api.staging.maisonnettev2.local
KEYCLOAK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
```

### Production Environment

**.env.production (created by CI/CD):**
```
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:secure_password@localhost:5432/maisonnettev2_prod
VITE_API_URL=https://api.maisonnettev2.local
KEYCLOAK_REALM_URL=https://idp.maisonnettev2.local/application/o/maisonnettev2/
STRIPE_SECRET_KEY=sk_live_...
SENTRY_DSN=https://...@sentry.io/...
```

## Reverse Proxy Setup (Caddy)

On VPS, add to Caddyfile:

```caddyfile
# Staging
api.staging.maisonnettev2.local {
    reverse_proxy localhost:3001
}

# Production
api.maisonnettev2.local {
    reverse_proxy localhost:3002
}
```

Restart Caddy:
```bash
sudo systemctl restart caddy
```

## Database Backups

```bash
# Manual backup
ssh deploy@vps
docker-compose exec postgres-maisonnettev2 pg_dump -U maisonnettev2 maisonnettev2 > backup-$(date +%Y%m%d).sql

# Restore from backup
psql -U maisonnettev2 -d maisonnettev2 < backup-20260823.sql
```

## Monitoring & Rollback

### Health Checks

```bash
# Check API health
curl https://api.staging.maisonnettev2.local/health

# Check database
docker-compose exec postgres-maisonnettev2 psql -U maisonnettev2 -c "SELECT count(*) FROM gite;"
```

### Rollback Procedure

```bash
# If deployment fails, rollback to previous tag
ssh deploy@vps
cd /home/deploy/maisonnettev2
git checkout v1.2.3  # previous stable tag
docker-compose pull
docker-compose up -d
npx prisma migrate deploy
```

## GitHub Actions Secrets Checklist

```bash
# Run this locally to add all secrets
gh secret set STAGING_SSH_KEY < ~/.ssh/deploy_maisonnettev2
gh secret set STAGING_SSH_HOST -b "your-staging-vps-ip"
gh secret set STAGING_SSH_USER -b "deploy"
gh secret set STAGING_DATABASE_URL -b "postgresql://..."

gh secret set PROD_SSH_KEY < ~/.ssh/deploy_maisonnettev2
gh secret set PROD_SSH_HOST -b "your-prod-vps-ip"
gh secret set PROD_SSH_USER -b "deploy"
gh secret set PROD_DATABASE_URL -b "postgresql://..."
```

## Testing the Pipeline

### 1. Test CI on PR
```bash
git checkout -b feature/test-ci
echo "# Test" >> README.md
git add README.md
git commit -m "test: CI pipeline"
git push origin feature/test-ci

# Open PR, watch Actions tab
```

### 2. Test Staging Deploy
```bash
git checkout develop
git commit --allow-empty -m "test: staging deploy"
git push origin develop

# Watch Actions → Deploy to Staging
```

### 3. Test Prod Deploy (Manual)
```bash
# Go to Actions → Deploy to Production → Run workflow
# Select main branch
# Wait for approval prompt (if configured)
# Approve
# Watch deployment
```

## Troubleshooting

### SSH Connection Failed
```
Error: ssh: connect to host <ip> port 22: Connection refused
```

**Fix:**
1. Verify VPS IP is correct
2. Check firewall allows port 22
3. Test locally: `ssh -i key deploy@ip`

### Database Migration Fails
```
Error: Prisma migration failed
```

**Fix:**
1. Check DATABASE_URL is correct
2. SSH to VPS and test: `psql postgresql://...`
3. Check migrations exist: `ls backend/prisma/migrations/`

### Deployment Stuck
```
docker-compose up -d takes too long
```

**Fix:**
1. Check VPS disk space: `df -h`
2. Check Docker logs: `docker-compose logs -f`
3. Kill hung process: `docker-compose kill`

## Next Steps

1. **Copy workflow files** to `.github/workflows/`
2. **Configure GitHub Secrets** (SSH keys, DB URLs)
3. **Test CI on a PR**
4. **Set up Caddy reverse proxy** on VPS
5. **Deploy to staging** via develop branch
6. **Deploy to production** manually with approval

## References

- [GitHub Actions Secrets](https://docs.github.com/actions/security-guides/encrypted-secrets)
- [Appleboy SSH Action](https://github.com/appleboy/ssh-action)
- [Caddy Reverse Proxy](https://caddyserver.com/)
- [Docker Compose Production](https://docs.docker.com/compose/production/)
