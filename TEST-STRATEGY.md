# Test Automation Strategy — maisonnettev2

**Objectif:** Couverture TOTALE de toutes les fonctionnalités avec tests automatisés

---

## 📊 Test Pyramid

```
        ⬤ E2E (10%)
       ⬤ ⬡ Integration (30%)
      ⬡ ⬡ ⬡ Unit (60%)
```

**Ratios cibles:**
- **Unit Tests:** 60% (rapides, fiables, peu coûteux)
- **Integration Tests:** 30% (API + DB + Services)
- **E2E Tests:** 10% (workflows complets)

---

## 🧪 Types de Tests à Implémenter

### 1. UNIT TESTS (60%)
**Outils:** Vitest, Jest
**Couverture:** Fonctions, calculs, logic métier

```
Frontend:
- Components (calculs de prix, validations)
- Utilities (formatage, parsing)
- Store/State management

Backend:
- Service logic (calculs, transformations)
- Validators
- Middleware
```

**Cible:** ≥80% coverage

### 2. INTEGRATION TESTS (30%)
**Outils:** Vitest + SQLite test DB, supertest
**Couverture:** API endpoints + Database

```
Backend:
✅ POST /api/gites (create booking)
✅ GET /api/gites (list with filters)
✅ PUT /api/gites/:id (update)
✅ DELETE /api/gites/:id
✅ POST /api/auth/login
✅ POST /api/auth/logout
✅ Auth middleware validation
✅ Database transactions
✅ Error handling (400, 403, 404, 500)

Frontend:
✅ API calls + response handling
✅ Form submissions
✅ Navigation flows
✅ Error boundaries
```

**Cible:** ≥70% API endpoint coverage

### 3. E2E TESTS (10%)
**Outils:** Playwright
**Couverture:** Critical user workflows

```
Critical Paths:
✅ User login (OAuth2 flow)
✅ Book a gite (search → payment → confirmation)
✅ Admin dashboard (create, edit, delete listings)
✅ View reservations
✅ Message guest
✅ Logout

Performance:
✅ Page load times < 3s
✅ API response times < 200ms
```

**Cible:** 100% of critical paths

### 4. API TESTING
**Outils:** Postman, Rest Client
**Couverture:** All REST endpoints

```
REST Endpoints:
- Authentication (login, logout, refresh)
- Gites (CRUD operations)
- Reservations (CRUD)
- Reviews (CRUD)
- Payments (webhook validation)
- Users (profile, settings)
- Messages (send, list, delete)
- Admin (analytics, reports)
```

### 5. SECURITY TESTING
**Outils:** OWASP ZAP, Burp Suite basics
**Couverture:**

```
✅ SQL Injection prevention
✅ XSS protection
✅ CSRF tokens
✅ Authentication bypass attempts
✅ Authorization (role-based access)
✅ Input validation
✅ Rate limiting
✅ HTTPS enforcement
✅ Secure headers (CSP, X-Frame-Options)
```

### 6. PERFORMANCE TESTING
**Outils:** Lighthouse, WebPageTest, k6
**Targets:**

```
Frontend:
✅ Page load time < 3s
✅ Lighthouse score > 80
✅ Core Web Vitals (LCP, FID, CLS)

Backend:
✅ Response time < 200ms (p95)
✅ Throughput > 100 req/s
✅ DB queries < 50ms
```

### 7. VISUAL REGRESSION TESTING
**Outils:** Percy, Chromatic, Pixelmatch
**Couverture:**

```
Admin pages:
✅ Login page
✅ Dashboard
✅ Gite listings
✅ Booking details
✅ Message thread
```

### 8. CONTRACT TESTING
**Outils:** Pact.js
**Couverture:**

```
Frontend ↔ Backend contracts:
✅ GET /api/gites response shape
✅ POST /api/reservations request/response
✅ Auth token format
```

### 9. DATABASE TESTING
**Outils:** Jest + SQLite/PostgreSQL
**Couverture:**

```
✅ Schema integrity
✅ Constraints (FK, unique, NOT NULL)
✅ Migrations (up/down)
✅ Data integrity
✅ Query performance
```

### 10. ACCESSIBILITY TESTING
**Outils:** axe-core, WAVE
**Coverage:**

```
✅ WCAG 2.1 AA compliance
✅ Keyboard navigation
✅ Screen reader compatibility
✅ Color contrast
✅ Form labels
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Setup test infrastructure (Vitest, Playwright, Jest)
- [ ] Configure CI/CD for test runs
- [ ] Write unit tests for core utilities
- [ ] Write unit tests for validators
- [ ] Achieve 60% code coverage

### Phase 2: Integration (Week 3-4)
- [ ] Write API integration tests
- [ ] Write database integration tests
- [ ] Write auth flow tests
- [ ] Mock external services (payments, email)
- [ ] Achieve 70% API endpoint coverage

### Phase 3: E2E & Workflows (Week 5-6)
- [ ] Write E2E tests for critical paths
- [ ] Performance testing
- [ ] Security testing basics
- [ ] Visual regression tests

### Phase 4: Advanced (Week 7+)
- [ ] Load testing
- [ ] Contract testing
- [ ] Accessibility testing
- [ ] Compliance testing

---

## 🚀 CI/CD Integration

```yaml
# GitHub Actions workflow
- Run unit tests (all PRs)
- Run integration tests (all PRs)
- Run E2E tests (main branch only)
- Generate coverage reports
- Upload to Codecov
- Block merge if coverage < 70%
```

---

## 📊 Coverage Goals

| Layer | Current | Target |
|-------|---------|--------|
| Unit | 0% | 80% |
| Integration | 0% | 70% |
| E2E | 10% | 100% critical paths |
| Total | 10% | 70% |

---

## 🛠️ Tools Stack

```
Frontend:
- Vitest (unit)
- Playwright (E2E)
- axe-core (accessibility)

Backend:
- Jest (unit)
- Supertest (API)
- Pact (contracts)

Infrastructure:
- GitHub Actions (CI/CD)
- Codecov (coverage tracking)
- Sentry (error tracking)
```

---

## 📝 Test Examples

### Unit Test (Jest)
```javascript
describe('calculatePrice', () => {
  it('calculates discount correctly', () => {
    const price = calculatePrice(100, 0.2);
    expect(price).toBe(80);
  });
});
```

### Integration Test (Supertest)
```javascript
describe('POST /api/gites', () => {
  it('creates a gite with valid data', async () => {
    const res = await request(app)
      .post('/api/gites')
      .send({ name: 'Test', price: 100 })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });
});
```

### E2E Test (Playwright)
```javascript
test('user can book a gite', async ({ page }) => {
  await page.goto('https://maisonnette.fr');
  await page.click('text=Search');
  await page.fill('input[name="dates"]', '2026-09-01');
  await page.click('text=Book');
  await expect(page).toHaveURL(/confirmation/);
});
```

---

## ✅ Definition of Done

A feature is production-ready when:
- [ ] Unit tests written (≥80% coverage)
- [ ] Integration tests written
- [ ] E2E tests written (if user-facing)
- [ ] Security tests passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] CI/CD pipeline passes

---

## 🎯 Monthly Targets

- **Week 1:** 30% total coverage
- **Week 2:** 50% total coverage
- **Week 3:** 65% total coverage
- **Week 4:** 70% total coverage (goal)

---

## 📚 Resources

**Best Practices:**
- [Testing Trophy](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) by Kent C. Dodds
- [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html) by Martin Fowler
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Google Testing Blog](https://testing.googleblog.com/)

**Tools:**
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Jest Docs](https://jestjs.io/)

---

**Status:** 🚧 In Progress
**Last Updated:** 2026-08-30
