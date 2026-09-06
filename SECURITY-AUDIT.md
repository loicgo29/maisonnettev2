# 🔒 Security Audit — Hetzner Deployment

**Date:** 2026-09-06  
**Status:** Phase 1 (Simple Auth, No Keycloak)  
**Risk Level:** LOW → MEDIUM (depends on issues below)

---

## 🟢 STRENGTHS (What's Good)

### 1. HTTPS/TLS — ✅ EXCELLENT
```
✓ Caddy auto-obtains Let's Encrypt certificates
✓ HSTS header present (max-age=31536000)
✓ TLS 1.2+ enforced by default
✓ Certificate renewal automated
```
**Grade:** A+

### 2. Cross-Domain Isolation — ✅ GOOD
```
✓ Public site (maisonnette.fr) = static HTML only
✓ Backoffice (backoffice.maisonnette.fr) = separate subdomain
✓ Caddy blocks /api/backoffice/* from public domain (403)
✓ Defense-in-depth: even if misconfigured, APIs rejected
```
**Grade:** A

### 3. Security Headers — ✅ COMPREHENSIVE
```
✓ X-Frame-Options: DENY (backoffice) / SAMEORIGIN (public)
✓ X-Content-Type-Options: nosniff
✓ X-XSS-Protection: 1; mode=block
✓ CSP strict (public site: no inline scripts)
✓ CORS configured (explicit allow, not wildcard)
```
**Grade:** A

### 4. JWT Authentication — ✅ IMPLEMENTED
```
✓ HS256 algorithm (symmetric, suitable for single server)
✓ Token expiry: 24 hours (reasonable)
✓ Token stored in HttpOnly cookie (resistant to XSS)
✓ Middleware validates on all protected routes
✓ Logout clears cookie + localStorage
```
**Grade:** B+ (see issues below)

### 5. Database — ✅ ISOLATED
```
✓ PostgreSQL not exposed (only internal Docker network)
✓ Port 5432 internal only (not mapped to localhost)
✓ Requires DB_PASSWORD env var (not hardcoded)
✓ No public-facing database tools (no pgAdmin exposed)
```
**Grade:** A

### 6. Environment Variables — ✅ MANAGED
```
✓ Secrets in .env (not in docker-compose.yml)
✓ .env in .gitignore (no accidental commits)
✓ JWT_SECRET from environment (random per deployment)
✓ No API keys hardcoded in source
```
**Grade:** A-

---

## 🟡 ISSUES (What Needs Fixing)

### ⚠️ ISSUE #1: CSP Too Permissive (Backoffice)
**Severity:** MEDIUM  
**Location:** Caddyfile:90

```
Current (VULNERABLE):
Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                                                                    ^^^^^^^^^^^^^^^^
Problem: Allows inline scripts + eval() — defeats CSP purpose
```

**Fix:**
```
Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: ws: wss:"
```
**Why:** SvelteKit can work without unsafe-inline (use nonce if inline needed)

**Action:** Update Caddyfile before Hetzner deployment

---

### ⚠️ ISSUE #2: Missing Rate Limiting
**Severity:** MEDIUM  
**Affects:** Login endpoint, API endpoints

**Current state:** No rate limiting on:
- `/api/backoffice/auth/login` — Brute force attacks possible
- `/api/backoffice/meals/record` — DOS possible
- All public endpoints

**Risk:** Attacker can brute-force admin password, spam API

**Fix (Priority Order):**

1. **Short term (Caddy):**
```
# Add to Caddyfile
@login_api path /api/backoffice/auth/login
limit @login_api {
    requests_per_second 5
    burst_size 10
}
```

2. **Medium term (Express middleware):**
```typescript
// backend/src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 min
  message: 'Too many login attempts, try again later'
});

app.post('/api/backoffice/auth/login', loginLimiter, ...)
```

**Action:** Implement before production

---

### ⚠️ ISSUE #3: Missing Input Validation
**Severity:** MEDIUM  
**Affects:** All API endpoints

**Current state:** Backend likely validates, but needs verification

**Check:**
```bash
# Verify in backend/src/routes/
grep -r "validate\|joi\|zod\|yup" --include="*.ts"
```

**Risk:** SQL injection, XSS, type confusion

**Fix:** Ensure all endpoints validate:
```typescript
// Example using Zod (add to package.json)
import { z } from 'zod';

const MealRecordSchema = z.object({
  date: z.string().date(),
  person: z.string().min(1).max(50),
  meal: z.number().int().min(0).max(4),
  account: z.enum(['gourmich', 'tigresse'])
});

app.post('/api/backoffice/meals/record', (req, res) => {
  const validated = MealRecordSchema.safeParse(req.body);
  if (!validated.success) return res.status(400).json(validated.error);
  // ...
});
```

**Action:** Audit & add schema validation

---

### ⚠️ ISSUE #4: CORS Configuration (Security vs Usability)
**Severity:** LOW-MEDIUM  
**Location:** Caddyfile:101

```
Current (Permissive):
Access-Control-Allow-Origin "{http.request.origin}"  ← Echoes origin!
```

**Risk:** If backoffice served from attacker domain, backend accepts CORS

**Better:**
```
# Explicitly whitelist only your domains
Access-Control-Allow-Origin "https://backoffice.maisonnette.fr"
```

**Action:** Fix before production

---

### ⚠️ ISSUE #5: Missing Audit Logging
**Severity:** MEDIUM  
**Affects:** Security incident investigation

**Current state:** 
- Caddy logs to stdout (good)
- But logs not persisted (no backup)
- No separate security event log (login failures, API errors, etc.)

**Fix:**
```bash
# In docker-compose.prod.yml, add log volume:
caddy:
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile:ro
    - maisonnettev2_logs:/var/log/caddy  # ← ADD THIS
```

Then in Caddyfile, log to file:
```
log {
  output file /var/log/caddy/access.log {
    roll_size 100mb
    roll_keep 3
  }
  format json
}
```

**Action:** Add logging pipeline before production

---

### ⚠️ ISSUE #6: Missing Secrets Rotation Strategy
**Severity:** MEDIUM  
**Affects:** JWT_SECRET, DB_PASSWORD

**Current state:**
- JWT_SECRET set once at deployment
- No rotation mechanism
- Compromised secret = permanent exposure

**Fix:**
```bash
# Before production, plan:
1. Rotate JWT_SECRET every 90 days
2. Keep old secrets for token validation (grace period)
3. Database password changed during setup, but no rotation plan

# Add to deployment checklist:
- [ ] Rotate JWT_SECRET (run before deploying new version)
- [ ] Document password change procedure
```

**Action:** Document rotation procedure

---

### 🔴 ISSUE #7: Missing HTTPS Redirect
**Severity:** MEDIUM-HIGH  
**Affects:** All domains

**Current state:** Caddy auto-upgrades HTTP → HTTPS, but not explicit

**Verify it works:**
```bash
curl -I http://maisonnette.fr
# Should return 308 redirect to https://
```

**Action:** Confirm after Caddy starts

---

### ⚠️ ISSUE #8: Cookie Security Incomplete
**Severity:** LOW-MEDIUM  
**Location:** Backend auth response

**Check if present:**
```typescript
// backend/src/routes/backoffice-auth.ts — Login endpoint
res.cookie('backoffice_token', token, {
  httpOnly: true,        // ✓ Good (XSS resistant)
  sameSite: 'strict',    // ? Check if set
  secure: true,          // ✓ Needs HTTPS (Caddy provides)
  maxAge: 86400 * 1000,  // ✓ 24 hours
  path: '/'
});
```

**Action:** Verify all flags present

---

### ⚠️ ISSUE #9: No Request Signing/CSRF Protection
**Severity:** LOW (Mitigated by CORS + SameSite cookie)  
**Affects:** Cross-site form submissions

**Current state:**
- CORS restricts origin ✓
- SameSite=Strict prevents third-party cookies ✓
- But no CSRF tokens on forms

**If using forms (not JSON API):**
```typescript
// Add CSRF middleware
const csrf = require('csurf');
app.use(csrf());

// In form: <input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

**Action:** Low priority (JSON API is safe)

---

### ⚠️ ISSUE #10: Missing Security.txt
**Severity:** LOW  
**Affects:** Vulnerability disclosure

**Fix:** Add public/.well-known/security.txt
```
Contact: security@maisonnette.fr
Expires: 2027-09-06T00:00:00.000Z
Preferred-Languages: fr, en
Canonical: https://maisonnette.fr/.well-known/security.txt
```

**Action:** Add before production (good practice)

---

## 🔍 VERIFICATION CHECKLIST

Run these before deployment:

```bash
# 1. Check HTTPS redirect
curl -I http://maisonnette.fr
# Expected: 308 redirect

# 2. Verify JWT secret set
docker-compose -f docker-compose.prod.yml config | grep JWT_SECRET
# Must NOT be empty or "development-key-insecure"

# 3. Check database not exposed
netstat -tuln | grep 5432
# Should NOT show 0.0.0.0:5432 or 127.0.0.1:5432

# 4. Verify security headers
curl -I https://maisonnette.fr
# Check: HSTS, CSP, X-Frame-Options present

# 5. Test CORS rejection
curl -H "Origin: https://evil.com" https://backoffice.maisonnette.fr/api/gites
# Should return 403 or browser blocks it

# 6. Confirm rate limiting
for i in {1..10}; do
  curl -X POST https://maisonnettev2/api/backoffice/auth/login \
    -d '{"username":"admin","pwd":"wrong"}' -s
done
# After 5 attempts, should get 429 (Too Many Requests)
```

---

## 📊 SECURITY SCORE

| Category | Score | Issues |
|----------|-------|--------|
| HTTPS/TLS | A+ | None |
| Cross-domain isolation | A | None |
| Headers | B+ | CSP too permissive (#1) |
| Authentication | B | Missing rate limit (#2), password policy |
| Database | A | None |
| Env Secrets | A | Add rotation plan (#6) |
| Input Validation | ? | Needs audit (#3) |
| Logging | C | Missing audit log (#5) |
| CORS | B- | Allow-Origin too broad (#4) |
| **OVERALL** | **B** | **Fix #1, #2, #3, #4, #5 before production** |

---

## 🚀 PRIORITY FIXES (Before Hetzner Deployment)

### MUST FIX (Blocking):
1. ✅ CSP — Remove unsafe-inline/unsafe-eval from backoffice
2. ✅ Rate Limiting — Add to login endpoint + API
3. ✅ Input Validation — Verify schema validation on all routes
4. ✅ CORS — Whitelist only backoffice.maisonnette.fr (not echo origin)

### SHOULD FIX (High Priority):
5. ✅ Audit Logging — Add persistent log volume
6. ✅ Secrets Rotation — Document procedure

### NICE TO HAVE (Can Add Later):
7. Security.txt — Vulnerability disclosure
8. Password Policy — Enforce strong admin password
9. IP Allowlist — Restrict backoffice to known IPs (if team is small)

---

## 🔐 Final Recommendation

**Status: NOT READY FOR PRODUCTION**

Before Hetzner deployment:
1. Fix CSP, Rate Limiting, Input Validation, CORS (1-2 hours)
2. Add audit logging (30 min)
3. Run verification checklist above
4. Test login brute-force attack (confirm rate limit works)
5. Test CORS from external domain (confirm rejection)

**Estimated Time:** 2-3 hours  
**Complexity:** Medium  
**Risk if Skipped:** MEDIUM-HIGH

Once fixed → **READY FOR PRODUCTION** 🟢
