# Test Automation — E2E & BDD

Automated testing suite for maisonnettev2 with **Playwright** + **Claude in Chrome**.

## 📋 Test Files

### E2E Tests (Playwright)
- **`tests/e2e/auth.spec.ts`** — OIDC authentication, login/logout, localStorage
- **`tests/e2e/gites.spec.ts`** — Gîte listing, detail page, gallery, navigation

### BDD Features (Gherkin)
- **`tests/e2e/features/user-journey.feature`** — User workflows and scenarios

## 🚀 Quick Start

### 1. **Automated Test Run**
```bash
./test-automation.sh
```

**Options:**
```bash
./test-automation.sh --headless    # Run without browser UI
./test-automation.sh --debug       # Enable debug logging
```

### 2. **Manual Playwright Tests**
```bash
cd frontend
npx playwright test
npx playwright test --headed       # Show browser
npx playwright test --debug        # Debug mode
npx playwright show-report         # View results
```

### 3. **Claude in Chrome Interactive Tests**

Start the test automation with browser interaction:
```bash
# Terminal 1: Start services
./test-automation.sh

# Terminal 2: Launch Claude in Chrome for manual testing
# Use the browser to:
# - Navigate to http://localhost:5173
# - Test login flow via Keycloak
# - Verify gîte browsing and booking flow
```

## 🔧 Services Required

Before running tests, ensure these are running:

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend | 3001 | http://localhost:3001 |
| Keycloak | 9001 | http://localhost:9001 |

**Start all services:**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Keycloak (from idp project)
cd ../idp && docker-compose up -d
```

## 📊 Test Coverage

### Authentication (auth.spec.ts)
- ✅ Login page visibility
- ✅ Protected route redirects
- ✅ Mock token in localStorage
- ✅ Logout flow
- ✅ Accessibility (headings, buttons, responsiveness)

### Gîtes Display (gites.spec.ts)
- ✅ Gîte listing on home page
- ✅ Navigation to detail page
- ✅ Card properties (name, price, capacity)
- ✅ Search/filter (if implemented)
- ✅ Detail page information
- ✅ Photo gallery
- ✅ Back navigation
- ✅ 404 handling

### User Journey (BDD Features)
- Browse gîtes without login
- View gîte details
- Initiate booking (requires Keycloak)
- Mobile responsiveness
- Accessibility compliance

## 🎭 Claude in Chrome Integration

### How to Use Claude in Chrome for Testing

1. **Launch browser automation:**
   ```bash
   npx playwright open http://localhost:5173
   ```

2. **Claude in Chrome captures:**
   - Page screenshots
   - Element interactions
   - Network requests
   - Console errors

3. **Test scenarios with Claude:**
   - Click "Login" button
   - Fill Keycloak credentials
   - Browse gîtes
   - Navigate to detail page
   - Verify page content

## 📈 CI/CD Integration

Tests run automatically on each commit via GitHub Actions:
```yaml
- name: Run E2E Tests
  run: npx playwright test --project=chromium
```

See `.github/workflows/ci.yml` for full configuration.

## 🐛 Debugging

### Debug Failed Tests
```bash
npx playwright test --debug
```

### View Test Report
```bash
npx playwright show-report
```

### Check Console Logs
Tests capture console errors — review in Playwright Inspector:
```bash
PWDEBUG=1 npx playwright test
```

### Backend Logs
```bash
tail -f /tmp/backend.log
```

### Frontend Logs
```bash
tail -f /tmp/frontend.log
```

## ⚙️ Configuration

### Playwright Config (`playwright.config.ts`)
- **Base URL:** `http://localhost:5173`
- **Timeout:** 30 seconds
- **Retries:** 2 (CI only)
- **Projects:** Chromium, Firefox, WebKit

### Keycloak Test User
```
Username: loic
Email: loic@logo-solutions.fr
Realm: maisonnettev2
```

## 🚨 Common Issues

### "404 Not Found" on Frontend
- Frontend routing may need configuration
- Check `vite.config.ts` and React Router setup
- Verify `index.html` exists

### Keycloak Auth Tests Fail
- Ensure Keycloak is running on :9001
- Check realm `maisonnettev2` exists
- Verify test user `loic` is created with correct credentials

### Tests Timeout
- Increase timeout in test (`.timeout(60000)`)
- Check backend health: `curl http://localhost:3001/health`
- Review browser logs for load errors

## 📝 Adding New Tests

### New E2E Test
```typescript
test('should do something', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Expected text');
});
```

### New BDD Feature
```gherkin
Scenario: User performs action
  Given precondition
  When user action
  Then expected result
```

## 🔗 References

- [Playwright Docs](https://playwright.dev)
- [Claude in Chrome](https://claude.ai/code)
- [Gherkin Syntax](https://cucumber.io/docs/gherkin/)
- [Project Architecture](./ARCHITECTURE.md)

---

**Last Updated:** 2026-08-23
**Status:** ✅ Ready for testing
