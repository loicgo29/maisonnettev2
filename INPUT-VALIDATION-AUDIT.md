# 🔍 Input Validation Audit

**Date:** 2026-09-06  
**Status:** PARTIAL (Zod on some routes, basic validation on others)

---

## 📋 Summary

| Route | File | Validation | Status |
|-------|------|-----------|--------|
| POST /backoffice/auth/login | backoffice-auth.ts | Basic | ⚠️ Needs Zod |
| POST /backoffice/meals/record | meals.ts | Basic | ⚠️ Needs Zod |
| GET /backoffice/meals/range | meals.ts | Basic | ⚠️ Needs Zod |
| GET /backoffice/meals/accounts | meals.ts | N/A | ✅ Safe |
| GET /backoffice/meals/export | meals.ts | N/A | ✅ Safe |
| POST /reservations | reservations.ts | **Zod** | ✅ Good |
| GET /gites | gites.ts | Basic | ⚠️ Check |
| GET /gites/:id | gites.ts | Basic | ⚠️ Check |

---

## ✅ GOOD: Using Zod Schema Validation

### reservations.ts (BEST PRACTICE)

```typescript
const ReservationCreateSchema = z.object({
  giteId: z.string().cuid(),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  clientNom: z.string().min(1),
  clientEmail: z.string().email(),
  clientTelephone: z.string().min(1),
});

// Usage in route:
router.post('/', async (req, res) => {
  const parsed = ReservationCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // ... use parsed.data
});
```

**Grade: A+** ✅

---

## ⚠️ ISSUES: Basic Validation Only

### 1. backoffice-auth.ts (Login Endpoint)

**Current (Line 37-43):**
```typescript
const { username, pwd } = req.body;

if (!username || !pwd) {
  res.status(400).json({ error: 'Username and secret required' });
  return;
}
```

**Problems:**
- ❌ No type checking (username could be number, object, etc.)
- ❌ No length validation (could accept 1-character password)
- ❌ No SQL injection protection (relying on Prisma only)
- ❌ Allows whitespace-only strings

**Risk: MEDIUM** (Brute-force, type confusion)

**Fix: Use Zod Schema**

```typescript
import { z } from 'zod';

const LoginSchema = z.object({
  username: z.string().min(1).max(100).trim(),
  pwd: z.string().min(4).max(256), // Password > 4 chars
});

router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid username or password format',
      issues: parsed.error.flatten() 
    });
  }
  
  const { username, pwd } = parsed.data;
  // ... rest of login logic
});
```

---

### 2. backoffice/meals.ts (Record Endpoint)

**Current (Line 40-68):**
```typescript
const { date, person, meal, account } = req.body;

if (!date || !person || meal === undefined || !account) {
  res.status(400).json({ error: 'Missing required fields...' });
  return;
}

if (typeof meal !== 'number' || meal < 0 || meal > 4) {
  res.status(400).json({ error: 'meal must be between 0 and 4' });
  return;
}
```

**Problems:**
- ⚠️ Date format not validated (could be "invalid-date")
- ⚠️ Person not validated against allowed values (could inject)
- ⚠️ Account value checked but not strictly typed
- ⚠️ No length limits on strings

**Risk: MEDIUM** (Date parsing errors, injection via person field)

**Fix: Use Zod Schema**

```typescript
const MealRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  person: z.enum(['Loïc', 'Mahaut', 'Alban', 'Ilan', 'Alice', 'Adèle', 'Joséphine', 'Albert', 'Oscar']),
  meal: z.number().int().min(0).max(4),
  account: z.enum(['gourmich', 'tigresse']),
});

router.post('/record', verifyBackofficeToken, async (req, res) => {
  const parsed = MealRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid meal record',
      issues: parsed.error.flatten()
    });
  }
  
  const { date, person, meal, account } = parsed.data;
  // ... rest of logic
});
```

---

### 3. backoffice/meals.ts (Range Endpoint)

**Current (Line 96-111):**
```typescript
const { startDate, endDate, account } = req.query;

if (!startDate || !endDate || !account) {
  res.status(400).json({ error: 'Missing query params...' });
  return;
}

const start = new Date(startDate as string).getTime();
const end = new Date(endDate as string).getTime();

if (Number.isNaN(start) || Number.isNaN(end)) {
  res.status(400).json({ error: 'Invalid date format' });
  return;
}
```

**Problems:**
- ⚠️ Query string validation (req.query is always strings)
- ⚠️ Account value not validated against enum
- ⚠️ Date range logic not validated (end could be before start)

**Risk: LOW-MEDIUM** (Date parsing, query injection)

**Fix: Use Zod Schema**

```typescript
const MealRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account: z.enum(['gourmich', 'tigresse']),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

router.get('/range', verifyBackofficeToken, async (req, res) => {
  const parsed = MealRangeSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid query parameters',
      issues: parsed.error.flatten()
    });
  }
  
  const { startDate, endDate, account } = parsed.data;
  // ... rest of logic
});
```

---

## 🔐 Security Implications

### SQL Injection Risk
- **Current:** LOW (Prisma uses parameterized queries)
- **After Zod:** VERY LOW (Double protection: type + parameterization)

### Type Confusion
- **Current:** MEDIUM (Express doesn't enforce types)
- **After Zod:** NONE (Zod enforces strict types)

### Date Parsing Errors
- **Current:** MEDIUM (Could cause 500 errors)
- **After Zod:** NONE (Pre-validated dates)

### Brute-Force Login
- **Current:** MEDIUM (No password length requirements)
- **After Zod:** LOW (Min 4 chars + rate limiting active)

---

## 📋 Implementation Checklist

### Fix 1: Add Zod to Login (backoffice-auth.ts)
- [ ] Create LoginSchema
- [ ] Update POST /login route with safeParse
- [ ] Add error handling for validation failures
- [ ] Test: Valid login, invalid credentials, missing fields

### Fix 2: Add Zod to Meals Record (meals.ts)
- [ ] Create MealRecordSchema with enum validation
- [ ] Update POST /record route
- [ ] Add error handling
- [ ] Test: Valid record, invalid date, invalid person

### Fix 3: Add Zod to Meals Range (meals.ts)
- [ ] Create MealRangeSchema with date validation + .refine()
- [ ] Update GET /range route
- [ ] Add error handling
- [ ] Test: Valid dates, invalid dates, date range validation

### Fix 4: Verify Other Routes (gites.ts, etc)
- [ ] [ ] Check gites.ts for input validation
- [ ] [ ] Check contact.ts for input validation
- [ ] [ ] Add Zod schemas where missing

---

## 🧪 Test Cases

### Login Endpoint Tests
```bash
# Valid login
curl -X POST http://localhost:3001/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pwd":"admin123"}'
# Expected: 200 + token

# Missing field
curl -X POST http://localhost:3001/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}'
# Expected: 400 + error

# Invalid type
curl -X POST http://localhost:3001/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":123,"pwd":"password"}'
# Expected: 400 + error

# Password too short
curl -X POST http://localhost:3001/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pwd":"123"}'
# Expected: 400 + error
```

### Meals Record Tests
```bash
TOKEN="<jwt-token>"

# Valid record
curl -X POST http://localhost:3001/api/backoffice/meals/record \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-06","person":"Loïc","meal":2,"account":"gourmich"}'
# Expected: 200 + record

# Invalid date format
curl -X POST http://localhost:3001/api/backoffice/meals/record \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"06/09/2026","person":"Loïc","meal":2,"account":"gourmich"}'
# Expected: 400 + error

# Invalid person
curl -X POST http://localhost:3001/api/backoffice/meals/record \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-06","person":"Unknown","meal":2,"account":"gourmich"}'
# Expected: 400 + error

# Invalid meal (> 4)
curl -X POST http://localhost:3001/api/backoffice/meals/record \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-06","person":"Loïc","meal":5,"account":"gourmich"}'
# Expected: 400 + error
```

### Meals Range Tests
```bash
TOKEN="<jwt-token>"

# Valid range
curl "http://localhost:3001/api/backoffice/meals/range?startDate=2026-09-01&endDate=2026-09-06&account=gourmich" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 + meals

# End date before start date
curl "http://localhost:3001/api/backoffice/meals/range?startDate=2026-09-06&endDate=2026-09-01&account=gourmich" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 + error

# Invalid date format
curl "http://localhost:3001/api/backoffice/meals/range?startDate=09-06-2026&endDate=2026-09-06&account=gourmich" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 + error
```

---

## ✅ VERDICT

**Status:** MEDIUM-HIGH PRIORITY  
**Effort:** 2-3 hours to implement all fixes  
**Risk if Skipped:** SQL injection (low), type confusion (medium), bad UX (validation errors)

**Recommendation:** Implement all Zod schemas before production deployment.

---

## 📚 Reference

- Zod docs: https://zod.dev
- Example schema: reservations.ts (line 20-27)
- Rate limiting: Already implemented via Caddy (5 login attempts/15 min)

---

**Next Step:** Implement Zod schemas in backoffice routes (auth.ts + meals.ts)
