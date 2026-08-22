# E2E Testing Guide — Adding data-testids

For Playwright E2E tests to work reliably, components need `data-testid` attributes.

## Why data-testid?

- **Stable:** Persists across CSS/styling changes
- **Semantic:** Describes test intent, not implementation
- **Accessible:** Doesn't interfere with UI logic

## Adding data-testids

### Gite Cards

```tsx
// frontend/src/pages/Home.tsx
<div
  data-testid="gite-card"
  className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer"
>
  {/* ... */}
</div>
```

### Gite Detail Page

```tsx
// frontend/src/pages/GiteDetail.tsx
<div data-testid="gite-details">
  <h1 data-testid="gite-name">{gite.nom}</h1>
  <p data-testid="gite-description">{gite.description}</p>
  <span data-testid="gite-price">{gite.prixNuit.toFixed(2)} €/nuit</span>
  <span data-testid="gite-capacity">{gite.capacite} personnes</span>
</div>

<div data-testid="gite-photos">
  {/* photo gallery */}
</div>

<div data-testid="booking-section">
  {/* booking form or login prompt */}
</div>
```

### Login Page

```tsx
// frontend/src/pages/Login.tsx
<button
  data-testid="login-email"
  onClick={login}
>
  Se connecter avec Email
</button>

<button
  data-testid="login-google"
  onClick={login}
>
  Google
</button>

<button
  data-testid="login-github"
  onClick={login}
>
  GitHub
</button>
```

### Header/Navigation

```tsx
// frontend/src/components/Header.tsx (if created)
<nav data-testid="navigation">
  <a href="/" data-testid="nav-home">
    Home
  </a>
  <button
    data-testid="nav-logout"
    onClick={logout}
  >
    Déconnexion
  </button>
</nav>
```

### Forms

```tsx
// In booking/contact forms
<input
  data-testid="booking-date-start"
  type="date"
  {...register('dateStart')}
/>

<input
  data-testid="booking-date-end"
  type="date"
  {...register('dateEnd')}
/>

<button
  data-testid="booking-submit"
  type="submit"
>
  Confirmer la réservation
</button>
```

## Playwright Test Examples

### Using data-testids

```typescript
// tests/e2e/gites.spec.ts

// Find by data-testid
await page.locator('[data-testid="gite-card"]').first().click();

// Find multiple elements
const cards = page.locator('[data-testid="gite-card"]');
const count = await cards.count();

// Chain selections
const giteDetails = page.locator('[data-testid="gite-details"]');
const name = giteDetails.locator('[data-testid="gite-name"]');
await expect(name).toContainText('Test Gite');
```

### Fallback: CSS Selectors

If data-testid isn't present, use:

```typescript
// By role (preferred after data-testid)
page.getByRole('button', { name: /login/i })

// By text
page.getByText('Nos Gîtes')

// By placeholder
page.getByPlaceholder('Email')

// CSS selector (last resort)
page.locator('.gite-card button')
```

## Checklist for Making Tests Pass

- [ ] Components have `data-testid` attributes
- [ ] No dynamically generated test IDs (use constants)
- [ ] IDs are descriptive (e.g., `gite-card`, not `item-1`)
- [ ] Loading states have data-testid (for tests to wait)
- [ ] Error states have data-testid (for negative tests)
- [ ] Forms have data-testid on inputs and submit button
- [ ] Links/buttons have stable identifiers

## Running Tests After Adding data-testids

```bash
# Install Playwright (first time)
npx playwright install

# Run tests in headed mode (see browser)
npm run test:e2e -- --headed

# Debug specific test
npm run test:e2e:debug -- tests/e2e/gites.spec.ts

# Update snapshots if layout changed
npm run test:e2e -- --update-snapshots
```

## Common Issues

### Issue: Test can't find element
```
Error: Locator('[data-testid="gite-card"]') did not resolve to any DOM element.
```

**Fix:** 
1. Verify component actually has `data-testid="gite-card"`
2. Check if element is hidden/conditionally rendered
3. Add explicit wait: `await page.waitForSelector('[data-testid="gite-card"]')`

### Issue: Playwright times out waiting for element
```
Error: Timeout 30000ms exceeded
```

**Fix:**
1. Increase timeout for long-running operations
2. Add wait condition: `await page.waitForLoadState('networkidle')`
3. Check if API is running (backend must be live for E2E tests)

### Issue: Test passes locally but fails in CI
```
✅ Local: test passes
❌ CI: test fails
```

**Fix:**
1. CI may not have services running (start docker-compose in CI job)
2. Viewport might be different (set explicit viewport in test)
3. Timing differences (use explicit waits, not hardcoded timeouts)

## Best Practices Summary

✅ **Do:**
- Use descriptive data-testid names
- Name IDs after component purpose, not styling
- Add IDs to elements users interact with
- Use data-testid + getByRole/getByText together
- Keep IDs consistent across refactors

❌ **Don't:**
- Use CSS class names for testing (brittle to style changes)
- Use dynamic/random IDs (breaks test reliability)
- Test implementation details (internal HTML structure)
- Hardcode timeouts (use explicit waits)
- Add test-only code to production (data-testid is OK, it's minimal)

## Example: Complete Component with Test IDs

```tsx
// frontend/src/components/GiteCard.tsx
export function GiteCard({ gite, onClick }: Props) {
  return (
    <div
      data-testid="gite-card"
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
    >
      <img
        data-testid="gite-image"
        src={gite.photo}
        alt={gite.nom}
      />
      <h3 data-testid="gite-title">{gite.nom}</h3>
      <p data-testid="gite-description">{gite.description}</p>
      <span data-testid="gite-price">
        {gite.prixNuit.toFixed(2)} €/nuit
      </span>
    </div>
  );
}

// tests/e2e/gite-card.spec.ts
test('gite card should be clickable', async ({ page }) => {
  await page.goto('/');

  const card = page.locator('[data-testid="gite-card"]').first();
  
  await expect(card.locator('[data-testid="gite-title"]')).toBeVisible();
  await expect(card.locator('[data-testid="gite-price"]')).toContainText('€/nuit');
  
  await card.click();
  
  await expect(page).toHaveURL(/\/gite\//);
});
```
