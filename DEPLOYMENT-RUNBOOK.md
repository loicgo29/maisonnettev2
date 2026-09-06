# 📋 Deployment Runbook — Hetzner Production

**Status:** Phase 1 (Simple auth, no Keycloak)  
**Target:** Hetzner CX23 (4 vCPU, 8GB RAM, 40GB SSD)  
**Time Estimate:** 30-45 minutes

---

## 📋 PREREQUISITES

Before starting, you need:

- [ ] Hetzner CX23 server provisioned (OS: Ubuntu 22.04 LTS or Debian 12)
- [ ] SSH access to server
- [ ] Domain names registered:
  - `maisonnette.fr`
  - `backoffice.maisonnette.fr`
- [ ] Access to domain registrar (for DNS records)
- [ ] Two random secrets generated:
  ```bash
  DB_PASSWORD=$(openssl rand -base64 32)
  JWT_SECRET=$(openssl rand -base64 32)
  echo "DB_PASSWORD: $DB_PASSWORD"
  echo "JWT_SECRET: $JWT_SECRET"
  ```

---

## 🚀 STEP 1: Server Setup

SSH to Hetzner server:

```bash
ssh root@<HETZNER-IP>
```

Update system:

```bash
apt update && apt upgrade -y
apt install -y curl wget git docker.io docker-compose-plugin
```

Verify Docker installed:

```bash
docker --version
docker compose version
```

Create deployment user (optional, recommended):

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
su - deploy
```

---

## 🔧 STEP 2: Clone Repository & Setup

```bash
cd /opt
git clone https://github.com/logo/maisonnettev2.git
cd maisonnettev2
```

Create environment file:

```bash
cp .env.example .env
nano .env  # Or your favorite editor
```

**Fill in `.env` with:**

```env
# Database
DB_USER=maisonnettev2
DB_PASSWORD=<paste-your-random-password>
DB_NAME=maisonnettev2

# Authentication
JWT_SECRET=<paste-your-random-secret>

# Owner Contact
OWNER_EMAIL=contact@maisonnette.fr
OWNER_PHONE=+33781103889

# Application
NODE_ENV=production
PORT=3001
```

Verify .env is **NOT in git**:

```bash
git status
# Should NOT show: .env
```

---

## 📝 STEP 3: DNS Configuration

**Before starting Docker**, create DNS records at your registrar (OVH, Namecheap, etc.):

```
Type: A
Name: maisonnette.fr
Value: <HETZNER-SERVER-IP>
TTL: 300

Type: A
Name: backoffice.maisonnette.fr
Value: <HETZNER-SERVER-IP>
TTL: 300
```

Verify DNS is resolving (wait 5-10 min for propagation):

```bash
nslookup maisonnette.fr
# Should return: <HETZNER-SERVER-IP>

nslookup backoffice.maisonnette.fr
# Should return: <HETZNER-SERVER-IP>
```

---

## 🐳 STEP 4: Deploy with Docker Compose

Start all services:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Wait 30 seconds for Caddy to obtain certificates and services to stabilize:

```bash
sleep 30
```

Check all services running:

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected output:**
```
NAME                      STATUS
maisonnette-postgres      Up (healthy)
maisonnette-backend       Up (healthy)
maisonnette-backoffice    Up (healthy)
maisonnette-public        Up (healthy)
maisonnette-caddy         Up
```

If any service is not healthy, check logs:

```bash
docker compose -f docker-compose.prod.yml logs <service-name>
# Example:
docker compose -f docker-compose.prod.yml logs maisonnette-backend
```

---

## 🗄️ STEP 5: Database Migrations

Apply Prisma migrations:

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

Seed database (if needed):

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

Verify database:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U maisonnettev2 -d maisonnettev2 -c "\dt"
```

---

## ✅ STEP 6: Verification

### 1. Test HTTPS (Public Site)

```bash
curl -I https://maisonnette.fr
# Expected: HTTP/2 200 or 301 (redirect)
```

Response should include:
```
HTTP/2 200 OK
Content-Security-Policy: default-src 'self'...
X-Frame-Options: SAMEORIGIN
```

### 2. Test Backoffice Login

```bash
curl -I https://backoffice.maisonnette.fr/backoffice/login
# Expected: HTTP/2 200
```

### 3. Test API (Protected)

Without token (should fail):

```bash
curl https://backoffice.maisonnette.fr/api/backoffice/meals/accounts
# Expected: HTTP 401 Unauthorized
```

### 4. Login & Get Token

```bash
TOKEN=$(curl -s -X POST https://backoffice.maisonnette.fr/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pwd":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

### 5. Test API with Token

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://backoffice.maisonnette.fr/api/backoffice/meals/accounts
# Expected: HTTP 200 + JSON response
```

### 6. Verify Security Headers

```bash
curl -I https://backoffice.maisonnette.fr/backoffice/login | grep -E "X-Frame-Options|Strict-Transport-Security|Content-Security-Policy"
# Expected: All three headers present
```

### 7. Verify Logs

```bash
docker compose -f docker-compose.prod.yml logs caddy | tail -20
docker compose -f docker-compose.prod.yml logs maisonnette-backend | tail -20
```

Logs should show successful requests (no errors).

---

## 🔄 STEP 7: Backup Verification

**Start backup service** (runs daily):

```bash
docker compose -f docker-compose.prod.yml --profile backup up -d backup
```

**Manual backup test:**

```bash
# Trigger a backup immediately
docker compose -f docker-compose.prod.yml --profile backup restart backup

# Wait 10 seconds
sleep 10

# Verify backup file created
ls -lah ./backups/
# Should show: db-YYYYMMDD-HHMMSS.sql.gz
```

**Backup restore test:**

```bash
# Create test database
docker compose -f docker-compose.prod.yml exec postgres \
  createdb -U maisonnettev2 test_restore

# Restore from backup
gunzip < ./backups/db-LATEST.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U maisonnettev2 test_restore

# Verify restore
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U maisonnettev2 -d test_restore -c "\dt"

# Clean up
docker compose -f docker-compose.prod.yml exec postgres \
  dropdb -U maisonnettev2 test_restore
```

---

## 📊 STEP 8: Monitoring Setup

### Health Check (Local)

Create cron job to monitor services every 5 minutes:

```bash
cat > ~/healthcheck.sh << 'EOF'
#!/bin/bash
DOMAINS=("maisonnette.fr" "backoffice.maisonnette.fr")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

for domain in "${DOMAINS[@]}"; do
  if curl -sf https://$domain > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ✓ $domain is UP"
  else
    echo "[$TIMESTAMP] ✗ $domain is DOWN - ALERT!"
    # Add your alert mechanism here (email, slack, etc)
  fi
done
EOF

chmod +x ~/healthcheck.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/healthcheck.sh >> /var/log/healthcheck.log") | crontab -
```

### Uptime Monitor (External)

Register with UptimeRobot (free tier):

1. Go to https://uptimerobot.com
2. Sign up (free account)
3. Add monitors:
   - URL: `https://maisonnette.fr`
   - URL: `https://backoffice.maisonnette.fr/backoffice/login`
   - URL: `https://backoffice.maisonnette.fr/api/health`
4. Set check interval: 5 minutes
5. Set alert email: your-email@example.com

---

## 🔐 STEP 9: Security Verification

Run security checks:

```bash
# 1. Rate limiting test (should fail after 5 attempts)
for i in {1..10}; do
  echo "Attempt $i:"
  curl -X POST https://backoffice.maisonnette.fr/api/backoffice/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","pwd":"wrong"}' \
    -w "\nHTTP %{http_code}\n" -s
  sleep 1
done
# Expected: After 5 attempts, returns HTTP 429 (Too Many Requests)

# 2. CORS test (should be rejected)
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  https://backoffice.maisonnette.fr/api/backoffice/meals \
  -v
# Expected: Browser would block this (not CORS headers)

# 3. CSP test (check no unsafe-inline)
curl -I https://backoffice.maisonnette.fr/backoffice/login | grep Content-Security-Policy
# Expected: No 'unsafe-inline' or 'unsafe-eval'
```

---

## 📝 STEP 10: Documentation & Handoff

Document your deployment:

```bash
cat > ~/DEPLOYMENT_NOTES.md << 'EOF'
# Deployment Notes

**Date:** $(date)
**Server:** <HETZNER-IP>
**Status:** ✅ LIVE

## Verification Results
- [ ] HTTPS working
- [ ] Login working
- [ ] API protected
- [ ] Backups running
- [ ] Monitoring active

## Admin Credentials
- Username: admin
- Password: <CHANGE THIS IMMEDIATELY>
- Location: backoffice.maisonnette.fr/backoffice/login

## Backup Location
- Path: /opt/maisonnettev2/backups/
- Schedule: Daily at <time>
- Retention: 7 days

## Monitoring
- UptimeRobot: <link>
- Health check: ~/healthcheck.sh

## Emergency Contacts
- ...
EOF

cat ~/DEPLOYMENT_NOTES.md
```

---

## 🚨 TROUBLESHOOTING

### Services won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Restart services
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### HTTPS not working

```bash
# Wait 30 seconds for Caddy to obtain certificate
sleep 30

# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Verify DNS resolution
nslookup maisonnette.fr
```

### Database connection failing

```bash
# Test connection
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U maisonnettev2 -d maisonnettev2 -c "SELECT 1"

# Check password in .env
cat .env | grep DB_PASSWORD
```

### Backup not running

```bash
# Start backup service
docker compose -f docker-compose.prod.yml --profile backup up -d backup

# Check backup logs
docker compose -f docker-compose.prod.yml logs backup
```

---

## 🎉 SUCCESS CHECKLIST

Once everything is running:

- [ ] HTTPS working on both domains
- [ ] Login page loads
- [ ] Meals API responds (with auth)
- [ ] Backups running daily
- [ ] Monitoring alerts configured
- [ ] Security headers verified
- [ ] Rate limiting working
- [ ] Database migrations applied
- [ ] Logs flowing
- [ ] Documentation updated

**Status: 🟢 LIVE IN PRODUCTION** 🎉

---

## 📞 SUPPORT

If issues arise:

1. Check logs: `docker compose logs <service>`
2. Restart service: `docker compose restart <service>`
3. Review DEPLOYMENT-AUDIT.md for troubleshooting
4. Contact: loic@logo-solutions.fr
