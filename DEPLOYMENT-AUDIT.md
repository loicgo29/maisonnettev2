# 📦 Deployment Audit — Hetzner Infrastructure

**Date:** 2026-09-06  
**Target:** Hetzner CX23 (4 vCPU, 8GB RAM, 40GB SSD)  
**Status:** Phase 1 (Simple, No Keycloak)

---

## 🟢 STRENGTHS (What's Ready)

### 1. Docker Orchestration — ✅ PRODUCTION-READY
```
✓ docker-compose.prod.yml configured
✓ All services have restart: unless-stopped
✓ Health checks on all services
✓ Named volumes for persistence
✓ Internal network isolation (maisonnette bridge)
✓ No privileged containers
✓ No hardcoded IPs
```
**Grade:** A

### 2. Multi-Stage Builds — ✅ OPTIMIZED
```
✓ Backend Dockerfile (Node.js multi-stage)
✓ Frontend Dockerfile.nginx (SvelteKit → Nginx)
✓ Reduces image size (not bloated)
✓ Only production code in final image
```
**Grade:** A

### 3. Environment Separation — ✅ GOOD
```
✓ docker-compose.yml (local dev)
✓ docker-compose.prod.yml (Hetzner production)
✓ .env files in .gitignore
✓ NODE_ENV=production in prod
```
**Grade:** A-

### 4. Database Strategy — ✅ SOLID
```
✓ PostgreSQL 16 Alpine (lightweight)
✓ Named volume for data persistence
✓ Health checks before dependent services start
✓ Automatic migrations via Prisma
✓ Connection pooling ready (PgBouncer not needed yet)
```
**Grade:** A

### 5. Reverse Proxy — ✅ EXCELLENT
```
✓ Caddy (auto HTTPS, simple config)
✓ Let's Encrypt automation
✓ Two-domain routing (maisonnette.fr + backoffice.*)
✓ Automatic redirects HTTP → HTTPS
✓ JSON logging to stdout (Docker-friendly)
```
**Grade:** A+

---

## 🟡 ISSUES (What Needs Attention)

### ⚠️ ISSUE #1: Missing Backup Strategy
**Severity:** CRITICAL  
**Affects:** Data loss risk

**Current state:** 
- PostgreSQL data in volume (good)
- But no backup to external storage
- If Hetzner fails: **DATA LOST**

**Risk:** Gîte booking data, admin accounts, meal tracking — all gone

**Fix (Priority Order):**

1. **Immediate (Automated Daily Backups):**
```bash
# Create backup service in docker-compose.prod.yml
backup:
  image: postgres:16-alpine
  container_name: maisonnette-backup
  restart: daily
  environment:
    PGPASSWORD: ${DB_PASSWORD}
  volumes:
    - ./backups:/backups
    - postgres_data:/data
  entrypoint: |
    bash -c 'while true; do
      pg_dump -h postgres -U ${DB_USER} ${DB_NAME} | gzip > /backups/db-$(date +%Y%m%d-%H%M%S).sql.gz
      find /backups -name "db-*.sql.gz" -mtime +7 -delete
      sleep 86400
    done'
```

2. **Better (Hetzner Backup Service):**
```bash
# Use Hetzner's automated backups:
# - Enable in Hetzner console
# - Stores on separate infrastructure
# - 7-day retention
# - Cost: ~€2/month
```

3. **Best Practice (Multi-tier):**
- Daily automated backup to Hetzner Backup Service
- Weekly backup pushed to S3 (AWS or Wasabi)
- Monthly backup archived offline

**Action:** **BLOCKING — Implement before production**

---

### ⚠️ ISSUE #2: Missing Monitoring & Alerting
**Severity:** HIGH  
**Affects:** Incident detection & response

**Current state:**
- No monitoring
- No alerts if services go down
- No metrics (CPU, memory, disk)
- No uptime tracking

**Risk:** Service down for hours, no one notices

**Fix:**

1. **Quick (Free):**
```bash
# Add health check script:
cat > healthcheck.sh << 'EOF'
#!/bin/bash
DOMAINS=("maisonnette.fr" "backoffice.maisonnette.fr")
for domain in "${DOMAINS[@]}"; do
  curl -s https://$domain > /dev/null && echo "✓ $domain" || echo "✗ $domain DOWN"
done
EOF

# Run every 5 min via cron (alerts you if down):
*/5 * * * * /path/to/healthcheck.sh >> /var/log/healthcheck.log
```

2. **Better (Uptime Monitoring):**
```bash
# Use free tier uptime monitors:
# - UptimeRobot (https://uptimerobot.com) — 50 monitors free
# - Pingdom — Free tier
# - SendGrid Status Page — Integrated
# Configure: Check every 5 min, alert if down
```

3. **Best (Prometheus + Grafana):**
```bash
# Add to docker-compose.prod.yml:
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "127.0.0.1:9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "127.0.0.1:3000:3000"

# Scrapes metrics from all services
# Shows dashboards (CPU, memory, requests, errors)
```

**Action:** At minimum, add UptimeRobot + health check script

---

### ⚠️ ISSUE #3: Missing Log Aggregation
**Severity:** MEDIUM  
**Affects:** Debugging, auditing

**Current state:**
- Caddy logs to stdout (good)
- Backend logs to stdout (good)
- But logs disappear if container restarts
- Hard to search/analyze

**Risk:** No audit trail if attack happens

**Fix:**

1. **Quick (Log Files):**
```yaml
# In docker-compose.prod.yml, mount log volumes:
caddy:
  volumes:
    - maisonnettev2_caddy_logs:/var/log/caddy

backend:
  volumes:
    - maisonnettev2_backend_logs:/app/logs
```

2. **Better (Centralized Logging):**
```bash
# Add to docker-compose.prod.yml:
loki:
  image: grafana/loki
  ports:
    - "127.0.0.1:3100:3100"

# All containers send logs to Loki
# Search logs in Grafana dashboards
# Free & lightweight
```

3. **Best (External Service):**
- Papertrail (Hetzner Cloud-friendly)
- Datadog
- Splunk

**Action:** Implement log persistence (Option 1) before production

---

### ⚠️ ISSUE #4: Missing Disaster Recovery Plan
**Severity:** HIGH  
**Affects:** Incident response

**Current state:** No plan if:
- Database corrupted
- Docker system fails
- Hetzner server down
- DNS hijacked

**Fix:**

```markdown
## Disaster Recovery Playbook

### 1. Database Corruption
- Restore from latest backup
- Run migrations: `npx prisma migrate deploy`
- Verify data integrity

### 2. Container Crash
- Caddy auto-restarts (unless-stopped)
- PostgreSQL auto-restarts
- Check logs: `docker logs <container>`
- If persistent: rebuild image

### 3. Disk Full
- Identify large files: `du -sh /var/lib/docker/volumes/*`
- Prune old logs: `find /var/log -mtime +30 -delete`
- Prune Docker images: `docker image prune -a`

### 4. Complete Server Failure
- Provision new Hetzner CX23
- Restore backup: `psql -h localhost < backup.sql`
- Redeploy containers: `docker-compose -f docker-compose.prod.yml up -d`
- Verify DNS points to new IP

### 5. Security Incident
- Revoke all JWT tokens: change JWT_SECRET
- Change DB password
- Review audit logs
- Notify users if needed
```

**Action:** Document and test before production

---

### ⚠️ ISSUE #5: Missing SSL Certificate Validation
**Severity:** MEDIUM  
**Affects:** MITM attacks, domain hijacking

**Current state:**
- Caddy auto-manages certificates
- Good: automated renewal
- Missing: certificate pinning
- Missing: DNS validation logging

**Fix:**

1. **Verify Caddy config:**
```bash
docker logs maisonnettev2-caddy | grep "certificate"
# Should show: Obtaining certificate, renewal scheduled, etc.
```

2. **Monitor certificate expiry:**
```bash
# Add to healthcheck.sh:
echo | openssl s_client -servername maisonnette.fr -connect maisonnette.fr:443 2>/dev/null | \
  openssl x509 -noout -dates
# Output: notBefore, notAfter dates
```

3. **Certificate pinning (Optional):**
```
# Not critical for phase 1, but good for phase 2
# Would require Caddy extension + client-side implementation
```

**Action:** Verify certificate renewal works (monitor logs)

---

### ⚠️ ISSUE #6: No Resource Limits
**Severity:** MEDIUM  
**Affects:** Runaway processes, DOS

**Current state:**
- Containers can use all CPU/memory
- No limits set
- Backend could consume 8GB and crash everything

**Fix:**

```yaml
# In docker-compose.prod.yml, add limits:
backend:
  deploy:
    resources:
      limits:
        cpus: '1'         # Max 1 CPU core
        memory: 512M      # Max 512MB
      reservations:
        cpus: '0.5'
        memory: 256M

caddy:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
```

**Action:** Add resource limits before production

---

### ⚠️ ISSUE #7: Missing Auto-Scaling / Load Balancing
**Severity:** LOW (Phase 1)  
**Affects:** High-traffic scenarios

**Current state:**
- Single server (Hetzner CX23)
- No horizontal scaling
- No load balancer
- One failure = complete outage

**Not needed yet, but plan for:**
```
Phase 2 (if traffic grows):
- Hetzner Load Balancer (€5/month)
- Multiple backend instances
- PostgreSQL read replicas
- Redis for caching

For now: Single instance is fine
```

**Action:** Monitor performance, scale if needed

---

### ⚠️ ISSUE #8: Incomplete Environment Configuration
**Severity:** MEDIUM  
**Affects:** Startup failures

**Current state:** docker-compose.prod.yml requires:
```
DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
OWNER_EMAIL, OWNER_PHONE
```

**Missing Documentation:**
```bash
# .env.example should list ALL required vars
# Create this before deploying:

DB_USER=maisonnettev2
DB_PASSWORD=<generate-random>
DB_NAME=maisonnettev2

JWT_SECRET=<generate-random-secret>

OWNER_EMAIL=contact@maisonnette.fr
OWNER_PHONE=+33781103889

NODE_ENV=production
```

**Fix:**
```bash
# Create .env.example
echo "DB_PASSWORD=<required>" >> .env.example
echo "JWT_SECRET=<required>" >> .env.example
# Commit to repo (without secrets)

# On Hetzner:
cp .env.example .env
# Edit .env with real values
```

**Action:** Document all required env vars

---

### ⚠️ ISSUE #9: No Deployment Runbook
**Severity:** MEDIUM  
**Affects:** Deployment errors

**Current state:** No documentation on:
- How to deploy first time
- How to apply migrations
- How to upgrade services
- How to rollback

**Fix:** Create DEPLOYMENT.md
```markdown
## First-Time Deployment (Hetzner)

### Prerequisites
- Hetzner CX23 server
- SSH access
- Domains: maisonnette.fr, backoffice.maisonnette.fr

### 1. Setup
```bash
ssh root@<server-ip>
apt update && apt install -y docker.io docker-compose
git clone <repo-url>
cd maisonnettev2
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with:
# - JWT_SECRET (generate: openssl rand -base64 32)
# - DB_PASSWORD (generate: openssl rand -base64 32)
# - Domains
```

### 3. Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify
```bash
# Check services running
docker ps

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Health checks
curl https://maisonnette.fr
curl https://backoffice.maisonnette.fr/backoffice/login
```
```

**Action:** Create before deployment

---

### ⚠️ ISSUE #10: Incomplete DNS Configuration
**Severity:** HIGH  
**Affects:** Service accessibility

**Current state:**
- Domains not configured yet
- No DNS records created
- Caddy will fail if domains unreachable

**Fix:**

```bash
# Before deploying, create DNS records:
# In your registrar (OVH, Namecheap, etc.):

# Type: A
# Name: maisonnette.fr
# Value: <Hetzner-Server-IP>
# TTL: 300

# Type: A
# Name: backoffice.maisonnette.fr
# Value: <Hetzner-Server-IP>
# TTL: 300

# Verify DNS working:
nslookup maisonnette.fr
# Should return: <Hetzner-Server-IP>
```

**Action:** Configure DNS before deploying

---

## 📊 DEPLOYMENT READINESS CHECKLIST

### Phase 0: Preparation (Before Server Deployment)
- [ ] Security audit completed (SECURITY-AUDIT.md)
- [ ] Deployment runbook written
- [ ] DNS records planned
- [ ] Backup strategy documented
- [ ] Monitoring setup planned
- [ ] Disaster recovery plan created

### Phase 1: Server Setup
- [ ] Hetzner CX23 provisioned
- [ ] SSH key installed
- [ ] Docker + Docker Compose installed
- [ ] Firewall configured (ports 80, 443 open)
- [ ] DNS records created
- [ ] Verify DNS propagation (`nslookup`)

### Phase 2: Application Deployment
- [ ] Clone repository
- [ ] Create .env with random JWT_SECRET, DB_PASSWORD
- [ ] Run `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Verify all containers running: `docker ps`
- [ ] Wait 30s for Caddy to obtain certificates
- [ ] Test HTTPS: `curl https://maisonnette.fr`
- [ ] Test backoffice: `curl https://backoffice.maisonnette.fr/backoffice/login`

### Phase 3: Validation
- [ ] HTTPS working (no warnings)
- [ ] Login page loads
- [ ] Meals API responds (with auth)
- [ ] Security headers present
- [ ] Logs flowing (check `docker logs`)
- [ ] Database migrations applied

### Phase 4: Ongoing Monitoring
- [ ] Health check script running (every 5 min)
- [ ] Uptime monitor configured (UptimeRobot)
- [ ] Log rotation working
- [ ] Backup running daily
- [ ] Alert system active

---

## 📊 INFRASTRUCTURE REQUIREMENTS

| Component | Current | Required | Status |
|-----------|---------|----------|--------|
| **Server** | Hetzner CX23 | 4 vCPU, 8GB RAM, 40GB SSD | ✅ |
| **OS** | Linux (Debian/Ubuntu) | Any Docker-capable | ✅ |
| **Docker** | Latest | 20.10+ | ⏳ Install |
| **Docker Compose** | Latest | 2.0+ | ⏳ Install |
| **Storage** | 40GB SSD | Min 20GB free | ✅ Sufficient |
| **Bandwidth** | Unlimited | 1Mbps+ | ✅ |
| **Backup Storage** | None | 5GB minimum | ⏳ Plan |

---

## 📊 DEPLOYMENT SCORE

| Category | Score | Issues |
|----------|-------|--------|
| Docker Setup | A | None |
| Configuration | B+ | Env vars not documented (#8) |
| Database | A | Backup missing (#1) |
| Networking | A | None |
| Monitoring | D | No monitoring (#2) |
| Logging | C | No log persistence (#3) |
| Recovery | D | No runbook (#9) |
| Security | B | See SECURITY-AUDIT.md |
| **OVERALL** | **C+** | **Fix #1-5, 8-9 before production** |

---

## 🚀 PRIORITY FIXES (Before Hetzner Deployment)

### MUST FIX (Blocking):
1. ✅ **Backup Strategy** — Database backup to Hetzner or S3
2. ✅ **DNS Configuration** — Create A records
3. ✅ **Deployment Runbook** — Step-by-step guide
4. ✅ **Environment Documentation** — .env.example with all vars
5. ✅ **Disaster Recovery** — Basic playbook

### SHOULD FIX (High Priority):
6. ✅ **Monitoring & Alerts** — UptimeRobot + health script
7. ✅ **Log Persistence** — Mount log volumes
8. ✅ **Resource Limits** — Add CPU/memory limits
9. ✅ **SSL Certificate Validation** — Verify renewal

### NICE TO HAVE (Phase 2):
10. Prometheus + Grafana (advanced monitoring)
11. Loki log aggregation
12. Horizontal scaling
13. Load balancer

---

## 🔐 Final Recommendation

**Status: NOT READY FOR PRODUCTION**

Before Hetzner deployment (2-4 hours):
1. Implement backup strategy (30 min)
2. Configure DNS records (10 min)
3. Write deployment runbook (30 min)
4. Document environment variables (15 min)
5. Create disaster recovery plan (30 min)
6. Setup monitoring (UptimeRobot) (15 min)
7. Test entire deployment locally with docker-compose.prod.yml (60 min)

**Then → READY FOR PRODUCTION** 🟢

Once deployed, continue:
- Monitor logs daily first week
- Run backup restore test (weekly)
- Document issues found
- Iterate on runbook
