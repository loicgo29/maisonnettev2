# Testing Strategy & Setup — maisonnettev2

Comprehensive testing across E2E, integration, unit, and BDD scenarios.

## Test Stack

| Layer | Tool | Purpose | Coverage |
|-------|------|---------|----------|
| **E2E** | Playwright | Full user flows (auth, browsing, booking) | Chrome, Firefox, Safari, Mobile |
| **Unit** | Vitest | React hooks, utility functions | Frontend + Backend |
| **Integration** | Vitest + Supertest | API endpoints, database interactions | CRUD operations |
| **BDD** | Cucumber (Gherkin) | Business scenarios in French | Business logic verification |

## Running Tests

### Frontend E2E Tests

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run in headed mode (watch browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate HTML report
npx playwright test
open test-results/index.html
```

**Available E2E tests:**
- `auth.spec.ts` — OIDC login/logout, session persistence
- `gites.spec.ts` — Gite listing, detail page, navigation, 404 handling

### Frontend Unit Tests

```bash
cd frontend

# Run all unit tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage report
npm run test -- --coverage

# Run specific test
npm run test -- useAuth
```

**Coverage targets:** 60% lines/functions/branches/statements

### Backend Integration Tests

```bash
cd backend

# Run all tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage report
npm run test -- --coverage

# Specific test file
npm run test -- gites.test.ts
```

**Available tests:**
- `oidc.test.ts` — JWT validation middleware
- `gites.test.ts` — Gite API endpoints, data integrity
- `reservations.test.ts` — Date conflict detection, price calculation, status management

### Backend BDD Tests

```bash
# Install Cucumber (if not already)
npm install --save-dev @cucumber/cucumber

# Run BDD features
npx cucumber-js features/reservations.feature

# Specific feature
npx cucumber-js features/reservations.feature --name "Créer une réservation"

# Generate HTML report
npx cucumber-js features/reservations.feature --format html:test-results/cucumber.html
```

**Features:**
- `reservations.feature` — 6 scenarios covering reservation logic (creation, conflicts, pricing, status, calendar sync)

## Coverage Reports

After running tests, view coverage:

```bash
# Frontend coverage
cd frontend && npm run test -- --coverage
open coverage/index.html

# Backend coverage
cd backend && npm run test -- --coverage
open coverage/index.html
```

**Targets:** 60%+ (strict on critical paths, lenient on infrastructure)

## CI/CD Integration

See `.github/workflows/ci.yml` for automated test runs:

```yaml
jobs:
  frontend-tests:
    - npm install
    - npm run type-check
    - npm run lint
    - npm run test (unit + coverage)
    - npm run test:e2e (E2E on Chrome only in CI)
    
  backend-tests:
    - npm install
    - npm run type-check
    - npm run lint
    - npm run test (integration + coverage)
    - npm run test -- features/ (BDD)
    
  security:
    - npm audit --audit-level=high
    - trivy image scan
```

## Test Data & Fixtures

### Database Seeding

For integration/BDD tests, database is reset for each test run:

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed  # (optional fixture seeder)
```

### Mock Data

Frontend E2E tests use real API (must be running):

```bash
# Terminal 1
docker-compose up -d

# Terminal 2 (frontend tests)
npm run test:e2e
```

Backend integration tests create/delete fixtures per test.

## Performance Benchmarks

### E2E Test Times
- Auth flow (login → home): ~3-5s
- Gite listing load: ~500ms
- Detail page load: ~800ms

### Unit Test Times
- Frontend: <100ms total
- Backend: <500ms total

### Integration Test Times
- Database operations: <100ms each
- API calls: <200ms each

## Known Issues & Workarounds

### Issue: Playwright timeout on first run
```bash
# Workaround: Pre-install browsers
npx playwright install
```

### Issue: Vitest can't find modules
```bash
# Ensure vitest.config.ts has correct path aliases
# Check tsconfig.json paths field
```

### Issue: Prisma mock doesn't work in tests
```bash
# Workaround: Use `vi.mock('@prisma/client')` at test file top
# Or use `prismock` for more complex scenarios
```

## Best Practices

### E2E Tests
✅ Use data-testid for reliable element selection
✅ Wait for elements explicitly (not just timeout)
✅ Test accessibility (keyboard, screen reader)
✅ Test mobile viewport
❌ Don't hardcode waits (waitForTimeout)
❌ Don't test implementation details

### Unit Tests
✅ Test hook behavior, not implementation
✅ Mock external dependencies
✅ Test error cases
✅ Keep tests isolated (no shared state)
❌ Don't test React internals
❌ Don't import actual Prisma in tests

### Integration Tests
✅ Use real database (test container or in-memory)
✅ Clean up after each test
✅ Test the full request/response cycle
✅ Verify data consistency
❌ Don't share test data between tests
❌ Don't test third-party libraries

### BDD Features
✅ Write scenarios in business language
✅ One scenario = one happy/sad path
✅ Use Given/When/Then consistently
✅ Keep scenarios independent
❌ Don't write test code in features
❌ Don't test implementation details

## Extending Tests

### Add new E2E test

```typescript
// frontend/tests/e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New Feature', () => {
  test('should do X', async ({ page }) => {
    await page.goto('/feature');
    // assertions...
  });
});
```

### Add new unit test

```typescript
// frontend/tests/unit/new-hook.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNewHook } from '../../src/hooks/useNewHook';

describe('useNewHook', () => {
  it('should return expected value', () => {
    const { result } = renderHook(() => useNewHook());
    expect(result.current).toBe(expected);
  });
});
```

### Add new BDD scenario

```gherkin
# features/new-feature.feature
Scénario: Description du nouveau scénario
  Étant donné qu'un condition initiale
  Quand j'effectue une action
  Alors un résultat attendu
```

## Continuous Testing

### Pre-commit Hook (optional)

```bash
# Install husky
npm install husky --save-dev
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test && npm run test:e2e"
```

### GitHub Actions CI

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests
- Manual trigger via Actions tab

View results in GitHub Actions tab or PR checks.

## Debugging Failed Tests

### E2E Debugging

```bash
# Run with debugging UI
npx playwright test --debug

# Inspect network requests
npx playwright test --trace on
open test-results/trace.zip  # Open in Playwright Trace Viewer
```

### Unit Test Debugging

```bash
# Watch mode with terminal UI
npm run test -- --watch

# Focus on single test
it.only('specific test', () => { ... })
```

### Integration Test Debugging

```bash
# Print database queries
// In vitest setup or test:
vi.spyOn(console, 'log');

# Check test database state
npx prisma studio
```

## Resources

- [Playwright docs](https://playwright.dev)
- [Vitest docs](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Cucumber.js](https://github.com/cucumber/cucumber-js)
- [Supertest](https://github.com/visionmedia/supertest)
