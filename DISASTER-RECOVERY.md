# 🆘 Disaster Recovery Playbook

**Status:** Phase 1 Production  
**Last Updated:** 2026-09-06  
**RTO:** Recovery Time Objective = 30 minutes  
**RPO:** Recovery Point Objective = 24 hours (daily backups)

---

## 📋 Table of Contents

1. [Database Corruption](#1-database-corruption)
2. [Container Crash](#2-container-crash)
3. [Disk Full](#3-disk-full)
4. [Complete Server Failure](#4-complete-server-failure)
5. [Security Incident](#5-security-incident)
6. [DNS Hijacking](#6-dns-hijacking)
7. [SSL Certificate Expiry](#7-ssl-certificate-expiry)

---

## 1. DATABASE CORRUPTION

**Symptoms:**
- Backend crashes with "database connection error"
- Error logs: `FATAL: could not open file`
- Queries failing with "disk I/O error"

**Recovery Steps:**

### Step 1: Assess Damage
```bash
ssh root@<server>
cd /opt/maisonnettev2

# Check database status
docker compose -f docker-compose.prod.yml exec postgres \
  pg_isready -U maisonnettev2

# Try to connect
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U maisonnettev2 -d maisonnettev2 -c "SELECT 1"
```

### Step 2: Stop Application
```bash
docker compose -f docker-compose.prod.yml down
```

### Step 3: Restore from Backup
```bash
# List available backups
ls -lah ./backups/

# Restore latest backup
BACKUP_FILE=$(ls -t ./backups/db-*.sql.gz | head -1)
echo "Restoring from: $BACKUP_FILE"

# Drop corrupted database
docker compose -f docker-compose.prod.yml exec postgres \
  dropdb -U maisonnettev2 maisonnettev2

# Create empty database
docker compose -f docker-compose.prod.yml exec postgres \
  createdb -U maisonnettev2 maisonnettev2

# Restore from backup
gunzip < "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U maisonnettev2 maisonnettev2
```

### Step 4: Verify Restore
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U maisonnettev2 -d maisonnettev2 -c "\dt"

# Should show tables: meals, reservations, etc.
```

### Step 5: Restart Application
```bash
docker compose -f docker-compose.prod.yml up -d
sleep 30

# Run migrations (in case schema changed)
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma migrate deploy
```

### Step 6: Verify
```bash
# Test API
curl -X POST https://backoffice.maisonnette.fr/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pwd":"admin123"}'

# Should return token (not 500 error)
```

---

## 2. CONTAINER CRASH

**Symptoms:**
- Service unavailable (HTTP 502/503)
- Container not running: `docker ps` shows missing container
- Error: "Connection refused"

**Recovery Steps:**

### Quick Fix
```bash
cd /opt/maisonnettev2

# Check which container crashed
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs <crashed-container>

# Restart the container
docker compose -f docker-compose.prod.yml restart <crashed-container>

# Verify it's running
docker compose -f docker-compose.prod.yml ps
```

### If Still Not Working
```bash
# Full restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Wait for services to stabilize
sleep 30

# Check health
curl https://maisonnette.fr
curl https://backoffice.maisonnette.fr/backoffice/login
```

### If Persistent
```bash
# Rebuild image
docker compose -f docker-compose.prod.yml build --no-cache <service>

# Restart
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f <service>
```

---

## 3. DISK FULL

**Symptoms:**
- Error: "No space left on device"
- Services won't start
- Database writes fail
- Backups can't be created

**Recovery Steps:**

### Step 1: Check Disk Usage
```bash
df -h
du -sh /var/lib/docker/volumes/*
du -sh ./backups/
```

### Step 2: Clean Old Backups
```bash
cd /opt/maisonnettev2/backups

# List backups
ls -lah db-*.sql.gz

# Delete old backups (keep last 3)
ls -t db-*.sql.gz | tail -n +4 | xargs rm
```

### Step 3: Clean Docker
```bash
# Stop containers
docker compose -f docker-compose.prod.yml down

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Check space again
df -h
```

### Step 4: Restart
```bash
docker compose -f docker-compose.prod.yml up -d
sleep 30

# Verify
curl https://maisonnette.fr
```

### Step 5: Prevent Future Incidents
```bash
# Limit backup retention to 5 files
ls -t ./backups/db-*.sql.gz | tail -n +6 | xargs rm

# Add to crontab to run weekly cleanup
(crontab -l 2>/dev/null; echo "0 2 * * 0 cd /opt/maisonnettev2 && ls -t ./backups/db-*.sql.gz | tail -n +8 | xargs rm -f") | crontab -
```

---

## 4. COMPLETE SERVER FAILURE

**Scenario:** Server is dead (hardware failure, accidental deletion, etc.)

**RTO:** ~45 minutes  
**Steps:**

### Step 1: Provision New Server
```bash
# 1. Order new Hetzner CX23
# 2. Wait 5 minutes for provisioning
# 3. Get new IP address
```

### Step 2: Update DNS Records
```bash
# At your registrar (OVH, Namecheap, etc.)
# Update A records to new server IP:
#   maisonnette.fr        → <NEW-IP>
#   backoffice.maisonnette.fr → <NEW-IP>
# Wait for DNS propagation (5-15 min)
```

### Step 3: Setup New Server
```bash
ssh root@<NEW-IP>

apt update && apt upgrade -y
apt install -y curl wget git docker.io docker-compose-plugin

cd /opt
git clone https://github.com/logo/maisonnettev2.git
cd maisonnettev2
```

### Step 4: Restore from Backup
```bash
# Copy backup to new server (if stored externally)
# Or download from backup service

# Create .env with same secrets as before
cp .env.example .env
nano .env  # Fill with original secrets

# Start services
docker compose -f docker-compose.prod.yml up -d
sleep 30

# Restore database
docker compose -f docker-compose.prod.yml exec postgres \
  createdb -U maisonnettev2 maisonnettev2

# If you have backup file locally:
gunzip < backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U maisonnettev2 maisonnettev2

# Run migrations
docker compose -f docker-compose.prod.yml exec backend \
  npx prisma migrate deploy
```

### Step 5: Verify
```bash
curl -I https://maisonnette.fr
curl -I https://backoffice.maisonnette.fr/backoffice/login

# Full healthcheck
./healthcheck.sh
```

### Step 6: Cleanup
```bash
# Terminate old server in Hetzner console
# Document incident
```

---

## 5. SECURITY INCIDENT

**Scenario:** Credentials compromised, suspicious activity, or attack detected

**Steps:**

### Immediate Actions (First 5 minutes)
```bash
# 1. Revoke all JWT tokens
#    Change JWT_SECRET in .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 2. Restart backend to apply new secret
docker compose -f docker-compose.prod.yml restart maisonnette-backend

# 3. Change admin credentials (via database)
#    Generate new bcrypt hash and update database
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U maisonnettev2 -d maisonnettev2 << 'EOF'
ALTER TABLE "BackofficeUser" DISABLE TRIGGER ALL;
UPDATE "BackofficeUser" SET credentials_updated=NOW() WHERE username='admin';
ALTER TABLE "BackofficeUser" ENABLE TRIGGER ALL;
\q
EOF
# Then manually update bcrypt hash in the password column
```

### Investigation (Next 30 minutes)
```bash
# 1. Review logs for suspicious activity
docker compose -f docker-compose.prod.yml logs caddy | grep -E "POST|PUT|DELETE"
docker compose -f docker-compose.prod.yml logs maisonnette-backend

# 2. Check audit logs
ls -lah ./logs/
cat ./logs/*

# 3. Review recent changes
git log --oneline -20

# 4. Check file integrity
find ./backend -type f -mtime -1  # Modified in last day
```

### Remediation
```bash
# 1. Block attacker IP (if known)
# Add to Caddyfile:
#   @attacker remote_ip <IP>
#   handle @attacker {
#     respond "Forbidden" 403
#   }

# 2. Restart Caddy
docker compose -f docker-compose.prod.yml restart maisonnette-caddy

# 3. Force password reset for all users
# Update database: expiry all sessions

# 4. Deploy fixed code (if vulnerability found)
git pull origin main
docker compose -f docker-compose.prod.yml build backend --no-cache
docker compose -f docker-compose.prod.yml up -d

# 5. Run security audit
./healthcheck.sh
```

### Notification
```bash
# Notify users if needed
# Create incident report with:
#   - What happened
#   - When it was discovered
#   - What we did about it
#   - What users should do (change password, etc.)
```

---

## 6. DNS HIJACKING

**Symptoms:** Domain points to wrong IP, website down

**Recovery:**

### Verify Hijacking
```bash
# Check current DNS records
nslookup maisonnette.fr
dig maisonnette.fr @8.8.8.8  # External DNS

# Compare with expected IP
echo "Expected: <HETZNER-IP>"
```

### Fix DNS
```bash
# 1. Log into domain registrar (OVH, Namecheap, etc.)
# 2. Update A records to correct IP:
#    Name: maisonnette.fr
#    Value: <HETZNER-IP>
#    TTL: 300

# 3. Verify propagation
nslookup maisonnette.fr
# Should return correct IP within 15 minutes
```

### Prevention
```bash
# 1. Enable 2FA on registrar account
# 2. Use strong password
# 3. Monitor DNS via tool like ZoneFile Monitor
# 4. Setup alerts for DNS changes (if available)
```

---

## 7. SSL CERTIFICATE EXPIRY

**Symptoms:** Browser warning "Certificate expired", HTTP 495 error

**Prevention:**
```bash
# Caddy auto-renews Let's Encrypt certificates
# But verify it's working:

# Check certificate
echo | openssl s_client -servername maisonnette.fr -connect maisonnette.fr:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check Caddy logs for renewal
docker compose -f docker-compose.prod.yml logs caddy | grep -i "renew\|certificate"
```

**If Renewal Fails:**
```bash
# Force renewal
docker compose -f docker-compose.prod.yml restart maisonnette-caddy
sleep 30

# Check logs
docker compose -f docker-compose.prod.yml logs caddy | tail -50

# Verify certificate renewed
echo | openssl s_client -servername maisonnette.fr -connect maisonnette.fr:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## 🆘 EMERGENCY CONTACTS

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary | Loïc | +33 7 81 10 38 89 | loic@logo-solutions.fr |
| Backup | | | |

---

## 📝 INCIDENT LOG

Document all incidents here:

```
Date: YYYY-MM-DD
Issue: <Description>
Duration: <Time to resolve>
Root Cause: <What caused it>
Resolution: <What was done>
Prevention: <How to prevent next time>
```

---

## ✅ RECOVERY CHECKLIST

After any incident:

- [ ] Services are running (`docker ps` shows all containers)
- [ ] HTTPS working (no certificate warnings)
- [ ] API responding (test login endpoint)
- [ ] Database accessible (test query)
- [ ] Backups running (check last backup timestamp)
- [ ] Logs are flowing (check log files)
- [ ] Monitoring active (UptimeRobot shows all green)
- [ ] DNS correct (nslookup shows right IP)
- [ ] Health check passing (`./healthcheck.sh`)
- [ ] Incident documented (add to log above)

---

## 📚 REFERENCE

- **Server Setup:** DEPLOYMENT-RUNBOOK.md
- **Security:** SECURITY-AUDIT.md
- **Infrastructure:** DEPLOYMENT-AUDIT.md
- **Backup Restore:** See "Database Corruption" section above

---

**Last tested:** [Date of last DR test]  
**Next test scheduled:** [Date]

**Recommendation:** Test recovery procedures monthly to ensure they work.
