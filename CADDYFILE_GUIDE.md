# Caddyfile Configuration Guide

## TL;DR : Deux versions différentes

- **`caddy/Caddyfile`** — Local dev (Mac mini) — services: `frontend:5173`, `alo-frontend:80`
- **`caddy/Caddyfile.hetzner`** — Production (Hetzner) — services: `backoffice:5173`, `public:80`, `alo-frontend:80`

⚠️ **NEVER copy local Caddyfile to production!**

---

## Deployment

### Local (Mac mini)

```bash
# Auto-restart Caddy with local Caddyfile
./scripts/deploy-caddyfile.sh local
```

Docker Compose loads `caddy/Caddyfile` automatically from the Dockerfile COPY.

### Production (Hetzner)

```bash
# Deploy Caddyfile.hetzner to Hetzner and restart
./scripts/deploy-caddyfile.sh hetzner

# Or manually:
scp caddy/Caddyfile.hetzner hetzner:/opt/maisonnettev2/Caddyfile
ssh hetzner "docker restart maisonnette-caddy"
```

### Auto-detect

```bash
# Runs from the correct server/environment automatically
./scripts/deploy-caddyfile.sh
```

---

## Key Differences

### Local Caddyfile (dev)

```
auto_https off                    # Cloudflare terminates TLS
:80 (listen on port 80)           # No public HTTPS needed

reverse_proxy frontend:5173       # Dev service name
reverse_proxy alo-frontend:80     # Test ALO locally
```

**Services in docker-compose.yml:**
- `frontend` → SvelteKit, port 5173
- `backend` → Express, port 3001
- `alo-frontend` → React, port 80
- `oauth2-proxy` → Port 4180

### Hetzner Caddyfile

```
{$DOMAIN}, www.{$DOMAIN}          # Caddy handles DNS/ACME
{$ACME_EMAIL}                     # Let's Encrypt email

reverse_proxy backoffice:5173     # Production service name
reverse_proxy public:80           # Production public site
```

**Services in docker-compose.prod.yml:**
- `backoffice` → SvelteKit, port 5173 (formerly `frontend`)
- `backend` → Express, port 3001
- `public` → nginx static site, port 80 (formerly `frontend`)
- `alo-frontend` → React, port 80
- `alo-backend` → Python, port 8000
- `oauth2-proxy` → Port 4180

---

## Common Mistakes (and How to Avoid Them)

### ❌ Mistake 1: Copy local Caddyfile to prod

```bash
# WRONG
scp caddy/Caddyfile hetzner:/opt/maisonnettev2/Caddyfile
```

→ Service names won't match → 502 Bad Gateway

### ✅ Fix

```bash
# RIGHT
./scripts/deploy-caddyfile.sh hetzner

# Or use the correct file
scp caddy/Caddyfile.hetzner hetzner:/opt/maisonnettev2/Caddyfile
```

---

### ❌ Mistake 2: Forget to rename services when updating config

When you add new routes, check the service names:

```caddy
# Local version
reverse_proxy frontend:5173

# Hetzner version
reverse_proxy backoffice:5173
```

### ✅ Fix

1. Make changes to BOTH `caddy/Caddyfile` AND `caddy/Caddyfile.hetzner`
2. Use `grep` to verify:
   ```bash
   grep -n "reverse_proxy" caddy/Caddyfile*
   ```
3. Service names must match docker-compose.yml or docker-compose.prod.yml

---

## Testing Routes

### Local

```bash
# Test local Caddyfile
curl -H 'Host: maisonnette.test' http://localhost/
curl -H 'Host: maisonnette.test' http://localhost/admin/alo
```

### Hetzner

```bash
# From Hetzner host itself
ssh hetzner "curl -H 'Host: maisonnette-pecheur-bertheaume.fr' http://localhost/"
ssh hetzner "curl -H 'Host: maisonnette-pecheur-bertheaume.fr' http://localhost/admin/alo"
```

Expected responses:
- `/` → HTTP 308 redirect to HTTPS
- `/admin/alo` → HTTP 401 Unauthorized (Keycloak protection active)
- No 502 Bad Gateway (routing working)

---

## Checklist Before Deploying

- [ ] Edit `caddy/Caddyfile.hetzner` (production)
- [ ] Also edit `caddy/Caddyfile` (local, keep in sync for reference)
- [ ] Verify service names match `docker-compose.prod.yml`
- [ ] Run `./scripts/deploy-caddyfile.sh hetzner`
- [ ] Test: `ssh hetzner "curl http://localhost/"`
- [ ] Commit both files: `git add caddy/Caddyfile*`

---

## Service Name Reference

| Service | Local | Prod Hetzner | Port | Role |
|---------|-------|-------|------|------|
| Frontend | `frontend` | `backoffice` | 5173 | SvelteKit (backoffice) |
| Public Site | `frontend` | `public` | 80 | Static HTML |
| Backend API | `backend` | `backend` | 3001 | Express |
| ALO Frontend | `alo-frontend` | `alo-frontend` | 80 | React accounting UI |
| ALO Backend | `alo-backend` | `alo-backend` | 8000 | Python API |
| OAuth2 Proxy | `oauth2-proxy` | `oauth2-proxy` | 4180 | Keycloak middleware |

---

## Files

- `caddy/Caddyfile` — Development version (local)
- `caddy/Caddyfile.hetzner` — Production version (Hetzner)
- `scripts/deploy-caddyfile.sh` — Automated deployment script
- `Dockerfile` — Builds Caddy image with local Caddyfile

---

## References

- [Caddy Documentation](https://caddyserver.com/docs/)
- `docker-compose.yml` — Local service definitions
- `docker-compose.prod.yml` — Hetzner service definitions
