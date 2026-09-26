# Déploiement Production — Hetzner

**Target:** `maisonnette-pecheur-bertheaume.fr` sur serveur Hetzner CX23 (€6.43/mois)

**Architecture:**
```
GitHub (main branch)
  ↓ (auto CI)
CI ✅ Tests pass
  ↓
Auto deploy to Hetzner (via GitHub Actions)
  ↓
docker-compose up -d (prod images)
  ↓
Caddy (TLS, routing, reverse proxy)
  ├─ Frontend (backoffice, public site)
  ├─ Backend (Express API)
  └─ Keycloak + oauth2-proxy (auth)
```

---

## 📋 Prérequis

- Hetzner account + API token (in Bitwarden: `hetzner` item)
- SSH key for deployment (`~/.ssh/maisonnettev2_hetzner`)
- Terraform (IaC for server provisioning)
- `.env.production` from Bitwarden (never committed)

---

## 🚀 Déploiement Initial (One-time Setup)

### 1️⃣ Hetzner API Token

```bash
# 1. Create account: https://console.hetzner.cloud
# 2. Security → API Tokens → Generate (Read & Write)
# 3. Store in Bitwarden: element "hetzner", note: api_token = ...
# ⚠️ Never commit or share this token
```

### 2️⃣ SSH Key

```bash
ssh-keygen -t ed25519 -C "maisonnettev2-hetzner" -f ~/.ssh/maisonnettev2_hetzner
# Public key → added to GitHub secrets for automation
```

### 3️⃣ Provision Server (Terraform)

```bash
cd maisonnettev2/infra/terraform

export TF_VAR_hcloud_token=$(
  BW_SESSION=$(/Volumes/logousb/SSD/Projects/bw-session.sh --raw) \
  bw get item hetzner --session "$BW_SESSION" \
    | jq -r '.notes' | grep -E '^\s*api_token\s*=' | sed -E 's/^\s*[^=]*=\s*//'
)
export TF_VAR_cle_ssh_publique="$(cat ~/.ssh/maisonnettev2_hetzner.pub)"

terraform init
terraform plan      # READ carefully before applying
terraform apply

# Output: IPv4, SSH command, DNS records to create
```

### 4️⃣ DNS Configuration

**⚠️ Important:** Keep Cloudflare in "DNS only" mode (gray cloud) until TLS cert is obtained.

At Cloudflare for `maisonnette-pecheur-bertheaume.fr`:

```
Type   | Name | Value         | Proxy
-------|------|---------------|----------
A      | @    | IPv4 from TF  | DNS only
A      | www  | IPv4 from TF  | DNS only
AAAA   | @    | IPv6 from TF  | DNS only
```

Wait for propagation:
```bash
dig +short maisonnette-pecheur-bertheaume.fr
```

### 5️⃣ Deploy Application

```bash
IP=$(cd infra/terraform && terraform output -raw ipv4)

# Copy source code (exclude node_modules, .git, dist)
rsync -az --exclude node_modules --exclude .git --exclude dist \
  /Volumes/logousb/SSD/Projects/maisonnettev2/ \
  deploy@$IP:/opt/maisonnettev2/

# Copy .env (generated locally from Bitwarden, NEVER on server)
./scriptslogo/setup/setup-env.sh --prod
scp maisonnettev2/.env.production deploy@$IP:/opt/maisonnettev2/.env.production
ssh deploy@$IP 'chmod 600 /opt/maisonnettev2/.env.production'
```

**Important:** Adapt `.env` for production:

| Variable | Dev | Prod |
|----------|-----|------|
| `DB_PASSWORD` | dev password | Strong from Bitwarden |
| `DOMAIN` | localhost | maisonnette-pecheur-bertheaume.fr |
| `PUBLIC_ORIGIN` | http://localhost:8030 | https://maisonnette-pecheur-bertheaume.fr |
| `NODE_ENV` | development | production |
| `ACME_EMAIL` | — | valid email for Let's Encrypt |

### 6️⃣ Start Services

```bash
ssh deploy@$IP
cd /opt/maisonnettev2

# Load env vars
export $(grep '^[A-Z]' .env.production | xargs)

# Start all services (with TLS cert generation)
docker compose -f docker-compose.prod.yml up -d --build

# Monitor Caddy logs (TLS handshake)
docker logs maisonnette-caddy -f
```

Prisma migrations run automatically via `docker-entrypoint.sh`.

### 7️⃣ Verify Deployment

```bash
# Health checks
curl -sI https://maisonnette-pecheur-bertheaume.fr/ | head -3  # HTTP/2 200
curl -s https://maisonnette-pecheur-bertheaume.fr/health       # OK

# Test OAuth2 routes (require auth)
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci

# Ensure internal services NOT exposed
nc -zv $IP 5432   # FAIL (PostgreSQL internal)
nc -zv $IP 3001   # FAIL (Backend internal)
```

### 8️⃣ Backups

On server, PostgreSQL backup to `/opt/maisonnettev2/backups/`:

```bash
ssh deploy@$IP

# Manual backup
cd /opt/maisonnettev2
docker exec maisonnette-postgres pg_dump -U maisonnettev2 maisonnettev2 | \
  gzip > backups/db-$(date +%Y%m%d-%H%M%S).sql.gz

# Auto-backup service (runs in docker-compose.prod.yml)
docker logs maisonnette-backup -f

# Download backups locally
scp -r deploy@$IP:/opt/maisonnettev2/backups/* ~/backups/hetzner/
```

---

## 🔄 Continuous Deployment (CD)

### GitHub Actions Workflow

Push to `main` branch → CI runs tests → Auto-deploy to Hetzner:

```yaml
# .github/workflows/deploy-prod.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Hetzner
        env:
          SSH_KEY: ${{ secrets.HETZNER_SSH_KEY }}
          HETZNER_IP: ${{ secrets.HETZNER_IP }}
        run: |
          # SSH to Hetzner + git pull + docker compose up -d
          ssh -i ~/.ssh/key deploy@$HETZNER_IP \
            "cd /opt/maisonnettev2 && git pull && docker compose -f docker-compose.prod.yml up -d"
```

### Manual Trigger

```bash
# SSH and update manually (if needed)
ssh deploy@$IP

cd /opt/maisonnettev2
git pull origin main
export $(grep '^[A-Z]' .env.production | xargs)
docker compose -f docker-compose.prod.yml up -d

# Verify
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

---

## 🛡️ Security Checklist

- [ ] `.env.production` never committed (in `.gitignore`)
- [ ] SSH key protected (in `~/.ssh/` with `chmod 600`)
- [ ] Hetzner API token only in Bitwarden
- [ ] Firewall: only SSH (22), HTTP (80), HTTPS (443) open
- [ ] PostgreSQL NOT exposed (internal docker network only)
- [ ] Caddy TLS cert auto-renewed (Let's Encrypt)
- [ ] Backups encrypted and stored offline
- [ ] OAuth2 secrets (`OAUTH2_CLIENT_SECRET`, `OAUTH2_COOKIE_SECRET`) from Bitwarden
- [ ] Keycloak admin password NOT in `.env` (use Bitwarden)

---

## 🔙 Rollback / Disaster Recovery

### Quick Rollback (last known good deploy)

```bash
ssh deploy@$IP
cd /opt/maisonnettev2

git log --oneline | head -5
git checkout <last-good-commit>

export $(grep '^[A-Z]' .env.production | xargs)
docker compose -f docker-compose.prod.yml up -d --build

docker logs maisonnette-caddy -f
```

### Full Restore (from backup)

```bash
# 1. Restore database
ssh deploy@$IP
gunzip < backups/db-YYYYMMDD-HHMMSS.sql.gz | \
  docker exec -i maisonnette-postgres psql -U maisonnettev2 maisonnettev2

# 2. Restart services
docker compose -f docker-compose.prod.yml restart backend caddy

# 3. Verify
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

### Total Disaster (Re-provision)

```bash
# Destroy + recreate server (volume survives, data intact)
cd infra/terraform
terraform destroy

# Then run provisioning steps 3-7 again
terraform apply
# ... deploy code ...
# ... restore DB if needed ...
```

---

## ⚠️ Important Notes

### Let's Encrypt Quota

5 certificates per domain per week. If debugging TLS repeatedly, use staging:

```bash
# In caddy/Caddyfile.hetzner
{
  # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory  # Uncomment for testing
}
```

### Docker Compose Override

`docker-compose.prod.yml` + override files use `!override` + `!reset` tags:

```bash
# Verify only 80/443 are published (NOT 8030, 3001)
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml config | grep published
```

### Cloudflare DNS Propagation

After DNS change, wait 24-48h for global propagation:

```bash
# Check multiple regions
dig @8.8.8.8 maisonnette-pecheur-bertheaume.fr    # Google DNS
dig @1.1.1.1 maisonnette-pecheur-bertheaume.fr    # Cloudflare DNS
```

### Service Port Security

- ✅ SSH (22) — restricted to your IP via `ips_ssh_autorisees` (Terraform)
- ✅ HTTP (80) — Caddy redirects to HTTPS
- ✅ HTTPS (443) — Caddy terminates TLS
- ❌ PostgreSQL (5432) — NOT accessible externally
- ❌ Backend (3001) — NOT accessible externally
- ❌ Keycloak (8080) — NOT accessible externally

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" to server | SSH key permissions: `chmod 600 ~/.ssh/maisonnettev2_hetzner` |
| Caddy cert not obtained | Check DNS propagation: `dig maisonnette-pecheur-bertheaume.fr` |
| 502 Bad Gateway | Check backend health: `docker logs maisonnette-backend` |
| OAuth2 401 unauthorized | Verify `OAUTH2_CLIENT_SECRET` in `.env.production` |
| Database migration fails | Manually run: `docker exec maisonnette-backend npm run prisma:migrate deploy` |
| Port already in use | SSH to server + `docker ps -a | grep -i port-conflict` |

---

## 📚 References

- **Caddy config:** `caddy/Caddyfile.hetzner`
- **Docker compose:** `docker-compose.prod.yml`
- **Infrastructure code:** `infra/terraform/`
- **OAuth2 setup:** `OAUTH2_DEV.md`
- **Local development:** `README.md`
