# Infrastructure — Caddy, Keycloak, Hetzner

**Complete guide to the production infrastructure stack on Hetzner.**

---

## 🏗️ Architecture Overview

```
Internet (HTTPS)
    ↓
Cloudflare DNS (maisonnette-pecheur-bertheaume.fr)
    ↓
Hetzner CX23 Server (100.113.214.55)
    ├─ Caddy (Port 80, 443)
    │   ├─ TLS termination (Let's Encrypt)
    │   ├─ Reverse proxy
    │   └─ Forward_auth to oauth2-proxy
    │
    ├─ oauth2-proxy (Port 4180, internal)
    │   └─ Validates tokens via Keycloak
    │
    ├─ Keycloak (Port 8080, internal)
    │   ├─ OIDC provider
    │   └─ PostgreSQL auth schema
    │
    ├─ Frontend (SvelteKit, Port 5173)
    ├─ Backend (Express, Port 3001)
    ├─ ALO Frontend (Port 80 on container)
    ├─ Comptabilité Frontend (Port 5174)
    │
    └─ PostgreSQL (Port 5432, internal only)
        ├─ public (maisonnettev2)
        ├─ alo (comptabilité familiale)
        └─ keycloak (auth schema)
```

---

## 🔐 Caddy — Reverse Proxy & TLS

**Config file:** `caddy/Caddyfile.hetzner` (production)

### Routes

```caddy
maisonnette-pecheur-bertheaume.fr {
  # Public routes (no auth required)
  handle /api/calendar* { reverse_proxy backend:3001 }
  handle /api/* { reverse_proxy backend:3001 }
  handle /health { reverse_proxy backend:3001 }
  handle /uploads/* { reverse_proxy backend:3001 }

  # Protected routes (OAuth2-Proxy validates)
  handle /oauth2/* { reverse_proxy oauth2-proxy:4180 }
  
  handle_path /admin/alo* {
    forward_auth oauth2-proxy:4180 { uri /oauth2/auth }
    reverse_proxy alo-frontend:80
  }
  
  handle_path /admin/comptabilite* {
    forward_auth oauth2-proxy:4180 { uri /oauth2/auth }
    reverse_proxy comptabilite-frontend:5174
  }
  
  handle /admin* {
    forward_auth oauth2-proxy:4180 { uri /oauth2/auth }
    reverse_proxy backoffice:5173
  }

  # Default: public site
  handle { reverse_proxy public:80 }

  # Security headers
  header X-Content-Type-Options "nosniff"
  header X-Frame-Options "SAMEORIGIN"
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}

# Keycloak auth server (separate domain)
auth.maisonnette-pecheur-bertheaume.fr {
  reverse_proxy keycloak:8080 {
    header_up X-Forwarded-Proto {scheme}
    header_up X-Forwarded-Host {host}
    header_up X-Forwarded-For {remote_host}
  }
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}
```

### TLS / HTTPS

- **Auto-renewal:** Let's Encrypt via ACME
- **Validation:** HTTP-01 (requires `:80` open)
- **Staging:** Uncomment `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` to test without quota limits

**Deployment:**
```bash
# Copy to Hetzner
scp caddy/Caddyfile.hetzner hetzner:/opt/maisonnettev2/Caddyfile

# Restart
ssh hetzner "docker restart maisonnette-caddy"

# Verify
curl -sI https://maisonnette-pecheur-bertheaume.fr/ | head -3
```

---

## 🔑 Keycloak — OAuth2 / OIDC Identity Provider

**Config:** `docker-compose.prod.yml` service `keycloak`

### Setup

**Realm:** `maisonnettev2`

**Client:** `maisonnettev2-backoffice`
- **Client ID:** `maisonnettev2-backoffice`
- **Client Secret:** `OAUTH2_CLIENT_SECRET` (from `.env.production`)
- **Valid Redirect URIs:**
  - `https://maisonnette-pecheur-bertheaume.fr/oauth2/callback` (prod)
  - `http://localhost:8030/oauth2/callback` (local dev)
  - `https://maisonnette-pecheur-bertheaume.fr/admin` (legacy)
  - `https://maisonnette-pecheur-bertheaume.fr/admin/*` (legacy)

**Users:** Created in Keycloak console
- Default: `logo-back` (admin user)
- Email verified: required for oauth2-proxy

### Access

**Admin console:** `https://auth.maisonnette-pecheur-bertheaume.fr/admin`

```bash
# SSH to server
ssh hetzner

# Get Keycloak admin credentials from .env.production
grep KC_ADMIN /opt/maisonnettev2/.env.production

# Or access via local port-forward
ssh -L 9000:localhost:8080 hetzner -N &
open http://localhost:9000/admin
```

### Database

Keycloak shares PostgreSQL with maisonnettev2:
```bash
# From local machine
ssh hetzner "docker exec maisonnette-postgres psql -U keycloak -d keycloak -c 'SELECT * FROM users LIMIT 5;'"
```

---

## 🛡️ oauth2-proxy — Auth Middleware

**Config:** `docker-compose.prod.yml` service `oauth2-proxy`

### Flags

```bash
--provider=oidc
--oidc-issuer-url=https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2
--client-id=maisonnettev2-backoffice
--client-secret=$OAUTH2_CLIENT_SECRET
--redirect-url=https://maisonnette-pecheur-bertheaume.fr/oauth2/callback
--cookie-secure=true
--cookie-httponly=true
--cookie-samesite=lax
--cookie-secret=$OAUTH2_COOKIE_SECRET
--http-address=0.0.0.0:4180
--email-domain=*
--insecure-oidc-allow-unverified-email=true
--whitelist-domain=maisonnette-pecheur-bertheaume.fr
--whitelist-domain=www.maisonnette-pecheur-bertheaume.fr
```

### Endpoints

- `GET /oauth2/start` — Redirect to Keycloak login
- `GET /oauth2/callback` — Keycloak callback (after login)
- `GET /oauth2/auth` — Caddy forward_auth check
- `GET /oauth2/sign_out` — Logout

---

## 🐳 Docker Services

All services run in `docker-compose.prod.yml`:

| Service | Image | Port | Network | Purpose |
|---------|-------|------|---------|---------|
| **caddy** | `caddy:latest` | 80, 443 | Public | Reverse proxy, TLS |
| **frontend** | `ghcr.io/.../maisonnettev2-frontend:latest` | 8030 | Internal | SvelteKit backoffice |
| **backend** | `ghcr.io/.../maisonnettev2-backend:latest` | 3001 | Internal | Express API |
| **public** | `ghcr.io/.../maisonnettev2-public:latest` | 80 | Internal | Static public site |
| **alo-frontend** | `ghcr.io/.../maisonnettev2-alo-frontend:latest` | 80 | Internal | ALO accounting UI |
| **alo-backend** | `ghcr.io/.../maisonnettev2-alo-backend:latest` | 8000 | Internal | ALO Python API |
| **comptabilite-frontend** | `ghcr.io/.../maisonnettev2-comptabilite-frontend:latest` | 5174 | Internal | SASU UI |
| **comptabilite-backend** | `ghcr.io/.../maisonnettev2-comptabilite-backend:latest` | 8001 | Internal | SASU API |
| **keycloak** | `quay.io/keycloak/keycloak:26.0` | 8080 | Internal | OIDC provider |
| **oauth2-proxy** | `quay.io/oauth2-proxy/oauth2-proxy:v7.6.0` | 4180 | Internal | Auth middleware |
| **postgres** | `postgres:16-alpine` | 5432 | Internal | PostgreSQL DB |
| **backup** | `postgres:16-alpine` | — | Internal | Daily backups |

**Network:** `maisonnette` (Docker bridge, no external exposure except Caddy)

---

## 📦 Docker Compose Overrides

**Local dev:** `docker-compose.yml`
- Publishes ports for local access (8030, 3001, etc.)
- Keycloak on `localhost:9000`

**Production:** `docker-compose.prod.yml` + `docker-compose.hetzner.yml`
- Uses `!override` to remove internal port publishing
- Only 80, 443 exposed (via Caddy)
- PostgreSQL internal only

**Verify:**
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml config | grep -A2 "ports:"
# Should ONLY show 80, 443 for Caddy
```

---

## 🔧 PostgreSQL — Shared Database

**Single PostgreSQL instance with multiple schemas:**

```sql
-- List schemas
\dn

-- Schema: public (maisonnettev2 data)
CREATE SCHEMA public;

-- Schema: alo (comptabilité familiale)
CREATE SCHEMA alo;

-- Schema: keycloak (authentication)
CREATE SCHEMA keycloak;
```

**Backup strategy:**
- Automated: `docker-compose.prod.yml` service `backup`
- Manual: `docker exec maisonnette-postgres pg_dump ...`
- Storage: `/opt/maisonnettev2/backups/` on Hetzner
- Retention: 7 days (auto-cleanup)

**Access from local:**
```bash
# Port 5433 (external, on Hetzner)
psql -h maisonnette-pecheur-bertheaume.fr -p 5433 -U maisonnettev2 -d maisonnettev2
# (Requires SSH port-forward or direct network access)

# Via SSH tunnel
ssh -L 5433:localhost:5432 hetzner -N &
psql -h localhost -p 5433 -U maisonnettev2 -d maisonnettev2
```

---

## 🌐 DNS & Cloudflare

**Domain:** `maisonnette-pecheur-bertheaume.fr`

**Cloudflare configuration:**
- **DNS records:**
  - `A @ → 100.113.214.55` (Hetzner IP)
  - `AAAA @ → [IPv6]` (if available)
  - `CNAME www → @`
- **Proxy status:** Initially "DNS only" (gray cloud) for TLS validation
- **HTTPS:** Always enabled (redirects HTTP → HTTPS)
- **TLS:** Full (Caddy terminates)

**Monitoring:**
```bash
dig maisonnette-pecheur-bertheaume.fr +short
nslookup maisonnette-pecheur-bertheaume.fr
```

---

## 🔐 Security Model

### Network Isolation

- **Public:** Only Caddy on ports 80, 443
- **Internal (Docker network):** All other services
- **Database:** Completely internal, no external access
- **SSH:** Restricted to operator IP (via Terraform `ips_ssh_autorisees`)

### Secrets Management

- **Never in `.env` files:** No passwords, keys, or secrets in source
- **Source:** Bitwarden only
- **Deployment:** `./scriptslogo/setup/setup-env.sh` → `.env.production` locally → SCP to server
- **On server:** `.env.production` file, `chmod 600`, only readable by `deploy` user

### TLS Certificates

- **Provider:** Let's Encrypt (free, auto-renewing)
- **Validation:** HTTP-01 (requires port 80 access)
- **Renewal:** Automatic (Caddy handles it)
- **Staging:** Use for testing (separate quota)

---

## 📊 Monitoring & Logs

**Real-time logs:**
```bash
ssh hetzner

docker compose -f docker-compose.prod.yml logs -f caddy        # Reverse proxy
docker compose -f docker-compose.prod.yml logs -f oauth2-proxy # Auth
docker compose -f docker-compose.prod.yml logs -f keycloak     # OIDC
docker compose -f docker-compose.prod.yml logs -f backend      # API
docker compose -f docker-compose.prod.yml logs -f postgres     # Database
```

**Health checks:**
```bash
curl -sf https://maisonnette-pecheur-bertheaume.fr/health && echo "OK"
curl -sf https://auth.maisonnette-pecheur-bertheaume.fr/health/live && echo "Keycloak OK"
```

**Automated tests:**
```bash
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

---

## 🔄 Updates & Maintenance

### Docker Image Updates

```bash
ssh hetzner
cd /opt/maisonnettev2

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart services
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose ps
```

### Caddy Configuration Changes

```bash
# Edit locally
vim caddy/Caddyfile.hetzner

# Deploy
./scripts/deploy-caddyfile.sh hetzner

# Verify
curl -sI https://maisonnette-pecheur-bertheaume.fr/ | head -3
```

### Keycloak Configuration Changes

Done via admin console (persisted in PostgreSQL):
```
https://auth.maisonnette-pecheur-bertheaume.fr/admin
```

No restart needed — changes are immediate.

---

## 🆘 Emergency Procedures

### Caddy Down (No HTTPS)

```bash
ssh hetzner
docker logs maisonnette-caddy
docker restart maisonnette-caddy
```

### oauth2-proxy Down (Auth Broken)

```bash
ssh hetzner
docker logs maisonnette-oauth2-proxy
docker compose -f docker-compose.prod.yml up -d oauth2-proxy
```

### PostgreSQL Down (Database Unavailable)

```bash
ssh hetzner
docker logs maisonnette-postgres
docker compose -f docker-compose.prod.yml up -d postgres

# Restore from backup if needed
gunzip < backups/db-YYYYMMDD-HHMMSS.sql.gz | \
  docker exec -i maisonnette-postgres psql -U maisonnettev2 maisonnettev2
```

### Keycloak Down (Users Can't Login)

```bash
ssh hetzner
docker logs maisonnette-keycloak
docker compose -f docker-compose.prod.yml up -d keycloak
# Wait 60s for startup
```

### Complete Restart

```bash
ssh hetzner
cd /opt/maisonnettev2
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Monitor startup
docker compose logs -f caddy
```

---

## 📚 References

- **Caddy docs:** https://caddyserver.com/docs/
- **Keycloak docs:** https://www.keycloak.org/documentation
- **oauth2-proxy docs:** https://oauth2-proxy.github.io/
- **Docker Compose:** `docker-compose.prod.yml`
- **Deployment guide:** `DEPLOYMENT.md`
- **OAuth2 dev guide:** `OAUTH2_DEV.md`
