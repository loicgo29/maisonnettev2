# Sage API Integration — Quick Start Guide

Get started with Sage API integration for maisonnettev2 comptabilité module in 5 minutes.

---

## Prerequisites

- Backend running: `cd backend && npm run dev`
- Postman or cURL installed
- Sage developer account (already created)

---

## 5-Minute Setup

### 1. Generate Authorization URL (30 seconds)

```bash
curl -X GET http://localhost:3001/api/backoffice/sage/auth-url
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://api.columbus.sage.com/oauth/authorize?...",
  "state": "abc123xyz"
}
```

**Copy the `authUrl`** — you'll need it next.

---

### 2. Authorize with Sage (1-2 minutes)

1. **Paste the `authUrl` into your browser**
2. **Log in to Sage** (if prompted)
3. **Grant permissions** to "maisonnettev2" app
4. **Browser redirects** to callback URL
5. **Copy the authorization code** from the URL:
   ```
   https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback?code=ABC123XYZ...
   ```
   → Extract: `ABC123XYZ...`

---

### 3. Exchange Code for Token (1-2 minutes)

```bash
curl -X POST http://localhost:3001/api/backoffice/sage/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"code": "PASTE_AUTH_CODE_HERE"}'
```

**Replace `PASTE_AUTH_CODE_HERE` with the code from Step 2.**

**Response:**
```json
{
  "success": true,
  "message": "Successfully authenticated with Sage",
  "tokenInfo": {
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "scope": "invoice:create invoice:read invoice:update customer:read"
  }
}
```

✅ **You now have access!** Token is stored securely on the server.

---

### 4. Test Invoice Creation (1-2 minutes)

First, get a valid backoffice JWT token (from login):

```bash
# Login to backoffice (default creds: admin/admin123)
curl -X POST http://localhost:3001/api/backoffice/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Extract the `token` from response, then create invoice:

```bash
curl -X POST http://localhost:3001/api/backoffice/sage/invoices \
  -H "Content-Type: application/json" \
  -H "Cookie: backoffice_token=YOUR_JWT_TOKEN_HERE" \
  -d '{
    "reference": "INV-TEST-001",
    "date": "2026-09-25",
    "dueDate": "2026-10-25",
    "customerId": "CUST-001",
    "amount": 500,
    "status": "draft",
    "lines": [
      {
        "description": "Test invoice for maisonnettev2",
        "quantity": 1,
        "unitPrice": 500
      }
    ]
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Invoice created successfully in Sage",
  "invoice": {
    "id": "INV-SAGE-12345",
    "reference": "INV-TEST-001",
    "date": "2026-09-25",
    "dueDate": "2026-10-25",
    "customerId": "CUST-001",
    "amount": 500,
    "status": "draft",
    "createdAt": "2026-09-25T10:30:00Z",
    "updatedAt": "2026-09-25T10:30:00Z"
  }
}
```

✅ **Invoice created in Sage!** You can now see it in your Sage Accounting dashboard.

---

## Common Endpoints Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/backoffice/sage/auth-url` | GET | ❌ | Generate OAuth2 URL |
| `/api/backoffice/sage/auth/callback` | POST | ❌ | Exchange code for token |
| `/api/backoffice/sage/invoices` | POST | ✅ | Create invoice |
| `/api/backoffice/sage/invoices` | GET | ✅ | List invoices |
| `/api/backoffice/sage/invoices/:id` | GET | ✅ | Get invoice details |
| `/api/backoffice/sage/invoices/:id/status` | PATCH | ✅ | Update invoice status |
| `/api/backoffice/sage/customers/:id` | GET | ✅ | Get customer info |
| `/api/backoffice/sage/health` | GET | ✅ | Test API connection |

---

## Useful Curl Commands

### List all invoices
```bash
curl -X GET http://localhost:3001/api/backoffice/sage/invoices \
  -H "Cookie: backoffice_token=YOUR_JWT_TOKEN"
```

### Get specific invoice
```bash
curl -X GET http://localhost:3001/api/backoffice/sage/invoices/INV-SAGE-12345 \
  -H "Cookie: backoffice_token=YOUR_JWT_TOKEN"
```

### Update invoice status to "submitted"
```bash
curl -X PATCH http://localhost:3001/api/backoffice/sage/invoices/INV-SAGE-12345/status \
  -H "Content-Type: application/json" \
  -H "Cookie: backoffice_token=YOUR_JWT_TOKEN" \
  -d '{"status": "submitted"}'
```

### Check API health
```bash
curl -X GET http://localhost:3001/api/backoffice/sage/health \
  -H "Cookie: backoffice_token=YOUR_JWT_TOKEN"
```

---

## Using Postman (Alternative)

### 1. Create new request: GET `/api/backoffice/sage/auth-url`
- Method: GET
- URL: `http://localhost:3001/api/backoffice/sage/auth-url`
- Send
- Copy `authUrl`

### 2. Create new request: POST `/api/backoffice/sage/auth/callback`
- Method: POST
- URL: `http://localhost:3001/api/backoffice/sage/auth/callback`
- Body: Raw JSON
  ```json
  {"code": "AUTH_CODE_FROM_STEP_1"}
  ```
- Send
- ✅ Authentication complete!

### 3. Create new request: POST `/api/backoffice/sage/invoices`
- Method: POST
- URL: `http://localhost:3001/api/backoffice/sage/invoices`
- Cookies: `backoffice_token=YOUR_JWT_TOKEN`
- Body: Raw JSON (invoice data)
- Send
- ✅ Invoice created!

---

## Debugging

### Error: "Access token not available"
→ You haven't completed the OAuth2 flow yet. Go back to Step 1.

### Error: "Cannot connect to Sage API"
→ Check that `SAGE_CLIENT_ID` and `SAGE_SUBSCRIPTION_KEY` are set in `.env`

### Error: "Invalid status"
→ Use only: `draft`, `submitted`, `paid`, `cancelled`

### Error: "Customer not found"
→ Verify the `customerId` exists in your Sage account

---

## Credentials (Already Set)

These are pre-configured in the service:

| Variable | Value |
|----------|-------|
| `SAGE_CLIENT_ID` | `db2V374OdU8r0cL4PWi6Zb43P6eCvNju` |
| `SAGE_SUBSCRIPTION_KEY` | `9314dc42591540d0a4dc1c414723dd8a` |
| `SAGE_REDIRECT_URI` | `https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback` |

✅ No setup needed — everything is ready!

---

## Next Steps

1. ✅ Complete OAuth2 authorization flow (Steps 1-3 above)
2. ✅ Test invoice creation (Step 4 above)
3. **Build Admin UI** — Create a button to trigger OAuth2 in the frontend
4. **Store Token in Database** — Encrypt and persist tokens for long-term use
5. **Implement Token Refresh** — Auto-refresh tokens before expiry
6. **Add Scheduler** — Sync invoices automatically via cron job

---

## Files to Know

- **Service:** `/backend/src/services/sage.ts` — Core OAuth2 + API logic
- **Routes:** `/backend/src/routes/backoffice/sage.ts` — API endpoints
- **Tests:** `/backend/test-sage-integration.ts` — Run: `npx tsx test-sage-integration.ts`
- **Docs:** `/SAGE_API_INTEGRATION.md` — Full documentation
- **Report:** `/SAGE_API_TEST_RESULTS.md` — Test results & status

---

## Help & Resources

- **Sage Developer Docs:** https://developer.sage.com/
- **API Test Results:** Run `npx tsx test-sage-integration.ts`
- **Full Documentation:** See `SAGE_API_INTEGRATION.md`
- **Troubleshooting:** See `SAGE_API_TEST_RESULTS.md` section "Troubleshooting"

---

**Status:** ✅ Ready to use — All code implemented and tested  
**Time to First Invoice:** ~5 minutes (this guide)  
**Complexity:** Low — Just 4 API calls to get started

Let's integrate Sage! 🚀
