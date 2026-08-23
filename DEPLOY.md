# 🚀 Deployment Guide - Maisonnettev2

## Production Deployment Process

### Prerequisites
- Docker & Docker Compose installed
- Node.js 20+ (for local development)
- PostgreSQL 16+ (for local development)
- Git access to repository

### CI/CD Pipeline

The project uses **GitHub Actions** for automated CI/CD:

1. **Frontend Pipeline**
   - Type checking (SvelteKit)
   - Build verification
   - Artifact upload

2. **Backend Pipeline**
   - TypeScript compilation
   - Prisma schema validation
   - Build verification

3. **Deployment (Production Only)**
   - Triggered on `main` branch push
   - Docker image build
   - Health check validation

### Local Development

```bash
# Frontend (SvelteKit)
cd frontend-new
npm install
npm run dev          # http://localhost:1234

# Backend (Express)
cd backend
npm install
npm run dev          # http://localhost:3001

# Database
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed test data
```

### Production Deployment

#### Using Docker Compose

```bash
# 1. Clone repository
git clone https://github.com/loicgo29/maisonnettev2.git
cd maisonnettev2

# 2. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 3. Build and start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify health
curl http://localhost:3001/health
curl http://localhost:1234

# 5. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Services

- **Frontend:** Port 5173 (SvelteKit)
- **Backend:** Port 3001 (Express + Prisma)
- **Database:** PostgreSQL 16
- **Reverse Proxy:** Caddy (SSL/TLS)

### Environment Variables

Required variables in `.env`:

```
DB_USER=maisonnette
DB_PASSWORD=<secure-password>
DB_NAME=maisonnettev2
DOMAIN=maisonnettev2.local
NODE_ENV=production
```

### Database Migrations

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed initial data
docker-compose exec backend npx prisma db seed
```

### Monitoring

```bash
# Container health
docker-compose ps

# Logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database
docker-compose exec postgres psql -U maisonnette -d maisonnettev2
```

### Scaling

#### Increase Backend Replicas
```bash
docker-compose up -d --scale backend=3
```

#### Enable SSL/TLS
Edit `Caddyfile`:
```
maisonnettev2.local {
  encode gzip
  reverse_proxy frontend:5173
  handle /api* {
    reverse_proxy backend:3001
  }
}
```

### Troubleshooting

**Backend not starting**
```bash
docker-compose logs backend
# Check database connection in .env
```

**Frontend not loading**
```bash
docker-compose logs frontend
# Check VITE_API_URL environment variable
```

**Database errors**
```bash
docker-compose exec postgres psql -U maisonnette -d maisonnettev2 -c "\dt"
```

### CI/CD Status

Check pipeline status: https://github.com/loicgo29/maisonnettev2/actions

### Security

- Environment variables stored in `.env` (not in repo)
- Database password required (strong password recommended)
- JWT secrets for authentication (if implemented)
- HTTPS via Caddy reverse proxy

### Backup & Recovery

```bash
# Backup database
docker-compose exec postgres pg_dump -U maisonnette maisonnettev2 > backup.sql

# Restore database
docker-compose exec -T postgres psql -U maisonnette maisonnettev2 < backup.sql

# Backup volumes
docker run --rm -v maisonnettev2_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz -C / data
```

### Version Releases

Tag releases on GitHub:
```bash
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

Docker images are automatically built with version tags.

---

**Last Updated:** 2026-08-23
**Status:** Production Ready ✅
