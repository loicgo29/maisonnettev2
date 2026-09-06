# ✅ Deployment Checklist — Final Verification

**Status:** Ready for Hetzner Production  
**Date:** 2026-09-06  
**Deployer:** _________________  
**Hetzner IP:** _________________

---

## 🔐 PRE-DEPLOYMENT (Local Verification)

### Infrastructure Ready
- [ ] Hetzner CX23 server provisioned (Ubuntu 22.04 LTS)
- [ ] SSH key installed (test: `ssh root@<IP>`)
- [ ] Firewall rules checked (ports 80, 443 open)
- [ ] IP address noted: ____________

### Domain Configuration
- [ ] Domain registrar has DNS records:
  - [ ] `maisonnette.fr` A record → `<IP>`
  - [ ] `backoffice.maisonnette.fr` A record → `<IP>`
- [ ] DNS propagated (test: `nslookup maisonnette.fr`)
- [ ] TTL set to 300 or lower

### Secrets Generated
- [ ] `DB_PASSWORD` generated (32 chars random)
  - [ ] Value: ___________________
- [ ] `JWT_SECRET` generated (32 chars random)
  - [ ] Value: ___________________
- [ ] Both stored securely (NOT in git, NOT in email)

### Repository Status
- [ ] All changes committed (no uncommitted files)
- [ ] Correct branch: `main`
- [ ] Latest code pulled: `git pull origin main`
- [ ] All fixes verified:
  - [ ] Caddyfile has rate limiting
  - [ ] docker-compose.prod.yml has backup service
  - [ ] backoffice-auth.ts has Zod schema
  - [ ] meals.ts has Zod schemas

### Documentation Complete
- [ ] DEPLOYMENT-RUNBOOK.md exists
- [ ] DISASTER-RECOVERY.md exists
- [ ] INPUT-VALIDATION-AUDIT.md exists
- [ ] SECURITY-AUDIT.md exists
- [ ] DEPLOYMENT-AUDIT.md exists
- [ ] .env.example has all required variables

---

## 🚀 DEPLOYMENT EXECUTION

### Step 1: Prepare Deployment Script
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2
chmod +x deploy-hetzner.sh
```
- [ ] Script is executable

### Step 2: Run Deployment
```bash
./deploy-hetzner.sh <HETZNER_IP>
```

**When prompted:**
- [ ] Provide DB_PASSWORD (or let script generate)
- [ ] Provide JWT_SECRET (or let script generate)
- [ ] Provide OWNER_EMAIL (default: contact@maisonnette.fr)
- [ ] Provide OWNER_PHONE (default: +33781103889)
- [ ] Confirm DNS records are created before proceeding

**Expected output:**
```
✓ Server setup complete
✓ Repository cloned
✓ Environment configured
✓ Services deployed and running
✅ DEPLOYMENT COMPLETE!
```

- [ ] No errors during deployment
- [ ] All Docker containers started

---

## ✅ POST-DEPLOYMENT (Verification)

### SSH Access Verified
```bash
ssh root@<HETZNER_IP>
cd /opt/maisonnettev2
```
- [ ] SSH connection working
- [ ] Directory present

### Docker Services Running
```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected status:**
```
NAME                      STATUS
maisonnette-postgres      Up (healthy)
maisonnette-backend       Up (healthy)
maisonnette-backoffice    Up (healthy)
maisonnette-public        Up (healthy)
maisonnette-caddy         Up
```

- [ ] All containers running
- [ ] No containers in "Exited" state
- [ ] Health checks passing

### HTTPS Endpoints Responding
```bash
curl -I https://maisonnette.fr
curl -I https://backoffice.maisonnette.fr/backoffice/login
```

**Expected:**
```
HTTP/2 200 OK
Content-Security-Policy: default-src 'self'...
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=31536000
```

- [ ] Public site returns 200
- [ ] Backoffice login returns 200
- [ ] Security headers present
- [ ] HTTPS working (no certificate warnings)

### Security Headers Verified
```bash
curl -I https://backoffice.maisonnette.fr/backoffice/login | grep -E "X-Frame-Options|Strict-Transport-Security|Content-Security-Policy"
```

- [ ] `X-Frame-Options: DENY` present
- [ ] `Strict-Transport-Security` present
- [ ] `Content-Security-Policy` present (no unsafe-inline)

### Authentication Testing
```bash
curl -X POST https://backoffice.maisonnette.fr/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pwd":"admin123"}'
```

**Expected:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "..."
  }
}
```

- [ ] Login succeeds with correct credentials
- [ ] JWT token returned
- [ ] Token is valid (eyJ... format)

### Rate Limiting Testing
```bash
for i in {1..10}; do
  curl -X POST https://backoffice.maisonnette.fr/api/backoffice/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","pwd":"wrong"}' \
    -w "\nHTTP %{http_code}\n" -s
  sleep 1
done
```

**Expected:**
```
HTTP 401 (attempts 1-5)
HTTP 429 (attempt 6+)
```

- [ ] First 5 attempts return 401
- [ ] Attempt 6+ returns 429 (Too Many Requests)
- [ ] Rate limiting working

### Database Access Verification
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U maisonnettev2 -d maisonnettev2 -c "SELECT 1"
```

**Expected:**
```
 ?column?
----------
        1
```

- [ ] Database connection successful
- [ ] Can execute queries

### Backup System Verification
```bash
docker compose -f docker-compose.prod.yml --profile backup up -d backup
sleep 10
ls -lah ./backups/
```

**Expected:**
```
-rw-r--r-- db-20260906-hhmmss.sql.gz
```

- [ ] Backup service started
- [ ] Backup file created
- [ ] File size > 0 bytes

### Logs Flowing Correctly
```bash
docker compose -f docker-compose.prod.yml logs --tail=20 caddy
docker compose -f docker-compose.prod.yml logs --tail=20 maisonnette-backend
```

**Expected:**
```
[timestamp] request to /api/backoffice/meals/range...
[timestamp] Starting backup...
```

- [ ] Caddy logs showing requests
- [ ] Backend logs showing API calls
- [ ] No ERROR level messages

### Health Check Script Passing
```bash
cd /opt/maisonnettev2
./healthcheck.sh
```

**Expected:**
```
✓ maisonnette.fr
✓ backoffice.maisonnette.fr
✓ Login page loads
✓ API protected
✓ SSL cert valid
✓ Docker containers running
✓ Disk usage normal
✓ Backup recent
✅ All checks passed!
```

- [ ] All health checks passing
- [ ] No warnings or errors

---

## 🔗 Monitoring Setup

### UptimeRobot Configuration
```
1. Go to https://uptimerobot.com
2. Sign up or login
3. Add monitors:
   - URL: https://maisonnette.fr
   - URL: https://backoffice.maisonnette.fr/backoffice/login
   - URL: https://backoffice.maisonnette.fr/api/health
4. Check interval: 5 minutes
5. Alert email: <your-email@example.com>
```

- [ ] UptimeRobot account created
- [ ] 3 monitors added
- [ ] Alert email configured

### Health Check Cron Job
```bash
ssh root@<HETZNER_IP>

# Create cron job
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/maisonnettev2/healthcheck.sh >> /var/log/healthcheck.log 2>&1") | crontab -

# Verify
crontab -l
```

- [ ] Cron job installed
- [ ] Runs every 5 minutes
- [ ] Log file exists

---

## 📊 Performance Baseline

Document initial performance metrics:

### Response Times
```bash
curl -w "\nTime: %{time_total}s\n" https://maisonnette.fr
curl -w "\nTime: %{time_total}s\n" https://backoffice.maisonnette.fr/backoffice/login
```

- [ ] Public site load time: _________ ms
- [ ] Backoffice login load time: _________ ms

### Disk Usage
```bash
df -h /
du -sh /opt/maisonnettev2
```

- [ ] Root filesystem usage: _________
- [ ] Project directory size: _________

### Memory Usage
```bash
free -h
docker stats --no-stream
```

- [ ] System memory available: _________
- [ ] Container memory usage: _________

---

## 🔐 Security Verification Summary

- [ ] HTTPS working (green lock in browser)
- [ ] CSP headers strict (no unsafe-inline)
- [ ] Rate limiting active (tested above)
- [ ] Input validation with Zod (backoffice routes)
- [ ] JWT authentication working
- [ ] Database isolated (not exposed)
- [ ] Backups running automatically
- [ ] Audit logs flowing
- [ ] No hardcoded secrets in code
- [ ] .env file contains all secrets

---

## 📋 Final Signoff

### Deployment Verified By
- Name: _________________
- Date: _________________
- Time: _________________

### Status
- [ ] ✅ ALL CHECKS PASSED — PRODUCTION READY
- [ ] ⚠️ SOME ISSUES FOUND (list below)

**Issues found (if any):**
```
1. ___________________________________
2. ___________________________________
3. ___________________________________
```

**Resolution:**
```
___________________________________
___________________________________
```

---

## 📞 Escalation Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary | Loïc | +33 7 81 10 38 89 | loic@logo-solutions.fr |
| Backup | | | |

---

## 📚 Reference Documents

- **Deployment Guide:** DEPLOYMENT-RUNBOOK.md
- **Disaster Recovery:** DISASTER-RECOVERY.md
- **Security Audit:** SECURITY-AUDIT.md
- **Input Validation:** INPUT-VALIDATION-AUDIT.md
- **Deployment Audit:** DEPLOYMENT-AUDIT.md

---

**Status:** 🟢 **READY FOR PRODUCTION**

Date deployed: ________________  
Version tag: `v2.0.0-production-2026-09-06`
