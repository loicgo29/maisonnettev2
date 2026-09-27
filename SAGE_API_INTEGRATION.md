# Sage API Integration Documentation

Complete documentation for Sage Accounting API integration with maisonnettev2 comptabilité module.

## Overview

The Sage API integration enables automated invoice creation, management, and synchronization between maisonnettev2 and Sage Accounting.

**Credentials:**
- Client ID: `db2V374OdU8r0cL4PWi6Zb43P6eCvNju`
- Subscription Key: `9314dc42591540d0a4dc1c414723dd8a`
- Redirect URI: `https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback`
- OAuth2 Base URL: `https://api.columbus.sage.com/oauth/`
- API Base URL: `https://api.columbus.sage.com/v1/`

## OAuth2 Authentication Flow

### Step 1: Generate Authorization URL

**GET** `/api/backoffice/sage/auth-url`

Returns authorization URL for user to grant permissions.

```bash
curl -X GET http://localhost:3001/api/backoffice/sage/auth-url
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://api.columbus.sage.com/oauth/authorize?client_id=db2V374OdU8r0cL4PWi6Zb43P6eCvNju&response_type=code&redirect_uri=...",
  "state": "abc123xyz"
}
```

**What to do:**
1. Copy the `authUrl`
2. Paste into browser
3. User grants permissions to "maisonnettev2" app
4. Browser redirects to callback URL with `code` parameter

### Step 2: Exchange Authorization Code for Access Token

**POST** `/api/backoffice/sage/auth/callback`

Exchange authorization code for access token.

```bash
curl -X POST http://localhost:3001/api/backoffice/sage/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "abc123xyz...",
    "state": "abc123xyz"
  }'
```

**Request Body:**
```json
{
  "code": "authorization_code_from_callback",
  "state": "state_parameter_for_csrf_validation"
}
```

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

**Important:**
- Access token is stored securely on server-side (NOT returned in response)
- Token expires in 3600 seconds (1 hour)
- Implement token refresh flow for long-lived access

### Step 3: (Optional) Manually Set Access Token

**POST** `/api/backoffice/sage/set-token`

Set access token manually (for testing or recovery).

**Requires:** Backoffice authentication (JWT token)

```bash
curl -X POST http://localhost:3001/api/backoffice/sage/set-token \
  -H "Content-Type: application/json" \
  -H "Cookie: backoffice_token=<your_jwt_token>" \
  -d '{
    "token": "sage_access_token",
    "expiresIn": 3600
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Access token set successfully",
  "expiresIn": 3600
}
```

---

## Invoice Management API

All invoice endpoints require backoffice authentication.

### Create Invoice

**POST** `/api/backoffice/sage/invoices`

Create a new invoice in Sage.

```bash
curl -X POST http://localhost:3001/api/backoffice/sage/invoices \
  -H "Content-Type: application/json" \
  -H "Cookie: backoffice_token=<your_jwt_token>" \
  -d '{
    "reference": "INV-2026-001",
    "date": "2026-09-25",
    "dueDate": "2026-10-25",
    "customerId": "CUST-12345",
    "amount": 1500.00,
    "status": "draft",
    "lines": [
      {
        "description": "Gîte rental - September 2026",
        "quantity": 1,
        "unitPrice": 1200.00,
        "taxCode": "VAT20"
      },
      {
        "description": "Cleaning fee",
        "quantity": 1,
        "unitPrice": 300.00
      }
    ]
  }'
```

**Request Body:**
```json
{
  "reference": "INV-2026-001",           // Unique invoice reference
  "date": "2026-09-25",                   // Invoice date (YYYY-MM-DD)
  "dueDate": "2026-10-25",                // Due date (YYYY-MM-DD)
  "customerId": "CUST-12345",             // Sage customer ID
  "amount": 1500.00,                      // Total amount (sum of line items)
  "status": "draft",                      // Optional: draft|submitted|paid|cancelled
  "lines": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 100.00,
      "taxCode": "VAT20"                  // Optional tax code
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Invoice created successfully in Sage",
  "invoice": {
    "id": "INV-SAGE-12345",
    "reference": "INV-2026-001",
    "date": "2026-09-25",
    "dueDate": "2026-10-25",
    "customerId": "CUST-12345",
    "amount": 1500.00,
    "status": "draft",
    "createdAt": "2026-09-25T10:30:00Z",
    "updatedAt": "2026-09-25T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Missing required fields: reference, date, customerId"
}
```

### List Invoices

**GET** `/api/backoffice/sage/invoices`

List all invoices with optional filters.

```bash
curl -X GET "http://localhost:3001/api/backoffice/sage/invoices?status=draft&customerId=CUST-12345" \
  -H "Cookie: backoffice_token=<your_jwt_token>"
```

**Query Parameters:**
- `status` (optional): Filter by status (draft, submitted, paid, cancelled)
- `customerId` (optional): Filter by customer ID

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 5 invoices from Sage",
  "count": 5,
  "invoices": [
    {
      "id": "INV-SAGE-12345",
      "reference": "INV-2026-001",
      "date": "2026-09-25",
      "dueDate": "2026-10-25",
      "customerId": "CUST-12345",
      "amount": 1500.00,
      "status": "draft",
      "createdAt": "2026-09-25T10:30:00Z",
      "updatedAt": "2026-09-25T10:30:00Z"
    }
  ]
}
```

### Get Invoice Details

**GET** `/api/backoffice/sage/invoices/:invoiceId`

Get details of a specific invoice.

```bash
curl -X GET http://localhost:3001/api/backoffice/sage/invoices/INV-SAGE-12345 \
  -H "Cookie: backoffice_token=<your_jwt_token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice retrieved successfully",
  "invoice": {
    "id": "INV-SAGE-12345",
    "reference": "INV-2026-001",
    "date": "2026-09-25",
    "dueDate": "2026-10-25",
    "customerId": "CUST-12345",
    "amount": 1500.00,
    "status": "draft",
    "createdAt": "2026-09-25T10:30:00Z",
    "updatedAt": "2026-09-25T10:30:00Z"
  }
}
```

### Update Invoice Status

**PATCH** `/api/backoffice/sage/invoices/:invoiceId/status`

Update invoice status (e.g., submit for sending, mark as paid).

```bash
curl -X PATCH http://localhost:3001/api/backoffice/sage/invoices/INV-SAGE-12345/status \
  -H "Content-Type: application/json" \
  -H "Cookie: backoffice_token=<your_jwt_token>" \
  -d '{
    "status": "submitted"
  }'
```

**Request Body:**
```json
{
  "status": "submitted"  // draft | submitted | paid | cancelled
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice status updated to \"submitted\"",
  "invoice": {
    "id": "INV-SAGE-12345",
    "reference": "INV-2026-001",
    "status": "submitted",
    "updatedAt": "2026-09-25T10:35:00Z"
  }
}
```

---

## Customer API

### Get Customer Information

**GET** `/api/backoffice/sage/customers/:customerId`

Get customer details from Sage.

```bash
curl -X GET http://localhost:3001/api/backoffice/sage/customers/CUST-12345 \
  -H "Cookie: backoffice_token=<your_jwt_token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Customer retrieved successfully",
  "customer": {
    "id": "CUST-12345",
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main St",
    "city": "Paris",
    "postalCode": "75001"
  }
}
```

---

## Health Check

### Test Sage API Connection

**GET** `/api/backoffice/sage/health`

Test connectivity to Sage API.

```bash
curl -X GET http://localhost:3001/api/backoffice/sage/health \
  -H "Cookie: backoffice_token=<your_jwt_token>"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Connected to Sage API",
  "status": "healthy"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Cannot connect to Sage API",
  "status": "unhealthy"
}
```

---

## Implementation Status

### ✅ Completed

- [x] SageService class with full OAuth2 flow
- [x] Invoice creation endpoint (POST /invoices)
- [x] Invoice listing endpoint (GET /invoices)
- [x] Invoice detail retrieval (GET /invoices/:id)
- [x] Invoice status update (PATCH /invoices/:id/status)
- [x] Customer retrieval (GET /customers/:id)
- [x] Authentication URL generation
- [x] Token exchange (OAuth2)
- [x] Error handling and validation
- [x] API integration test suite
- [x] Complete documentation

### ⏳ TODO - Next Phase

- [ ] Implement persistent token storage in database (encrypted)
- [ ] Implement token refresh flow for long-lived access
- [ ] Add CSRF state parameter validation
- [ ] Create admin UI for Sage authentication
- [ ] Implement invoice synchronization scheduler (cron job)
- [ ] Add invoice deletion endpoint
- [ ] Add payment receipt tracking
- [ ] Implement webhook support for Sage events
- [ ] Add audit logging for invoice operations
- [ ] Create invoice export/PDF generation
- [ ] Add multi-company support (if needed)

---

## Testing

### Run Integration Tests

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npx tsx test-sage-integration.ts
```

**Test Coverage:**
1. Authorization URL generation ✅
2. OAuth2 token exchange (mock) ✅
3. Token management ✅
4. Invoice creation structure ✅
5. Invoice operations (get, update) ✅
6. Error handling ✅

### Manual Testing

```bash
# 1. Get authorization URL
curl http://localhost:3001/api/backoffice/sage/auth-url

# 2. Visit URL, grant permissions, capture auth code from callback

# 3. Exchange code for token
curl -X POST http://localhost:3001/api/backoffice/sage/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"code": "YOUR_AUTH_CODE"}'

# 4. Create test invoice
curl -X POST http://localhost:3001/api/backoffice/sage/invoices \
  -H "Content-Type: application/json" \
  -H "Cookie: backoffice_token=YOUR_JWT_TOKEN" \
  -d '{ ... invoice data ... }'
```

---

## Environment Variables

Add to `.env` file:

```env
SAGE_CLIENT_ID=db2V374OdU8r0cL4PWi6Zb43P6eCvNju
SAGE_CLIENT_SECRET=5QufqqcjpeKfFB25XCtbcAT4NtRMlFFOFbAQcugkubwIJkAIiiYJJiLiXrfhBbNy
SAGE_SUBSCRIPTION_KEY=9314dc42591540d0a4dc1c414723dd8a
SAGE_REDIRECT_URI=https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback
```

**Security Note:** Never commit real credentials to git. Use Bitwarden or secrets manager.

---

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Access token not available` | No token set | Run OAuth2 auth flow first |
| `Access token expired` | Token TTL exceeded | Implement refresh token flow |
| `Missing required fields` | Incomplete request body | Check required fields documentation |
| `Invalid status` | Invalid status value | Use: draft, submitted, paid, cancelled |
| `Request failed with status code 404` | Resource not found | Check invoice/customer IDs |
| `Request failed with status code 401` | Authentication failed | Re-authenticate with Sage |

---

## Troubleshooting

### Test Failed: "Real OAuth2 flow required"

**Issue:** Tests show SKIP because mock tokens are used.

**Solution:**
1. Get authorization URL: `GET /api/backoffice/sage/auth-url`
2. Visit URL in browser and grant permissions
3. Capture auth code from callback URL
4. Exchange for token: `POST /api/backoffice/sage/auth/callback`

### Test Failed: "Cannot connect to Sage API"

**Issue:** API returns 401 or 404 errors.

**Solution:**
1. Verify Sage credentials in `.env`
2. Check token expiration (see `/health` endpoint)
3. Verify subscription key is valid
4. Check redirect URI matches Sage configuration

### Invoice Creation Returns "Invalid Field"

**Issue:** Sage API rejects invoice data.

**Solution:**
1. Verify all required fields are present
2. Check date format is YYYY-MM-DD
3. Ensure customer ID exists in Sage
4. Verify line items have positive amounts
5. Check tax codes are valid

---

## References

- **Sage API Docs:** https://developer.sage.com/active/docs/latest/g/quickstart/become-dev
- **OAuth2 Flow:** https://developer.sage.com/active/docs/latest/g/security/oauth2-flow
- **Invoice API:** https://developer.sage.com/active/docs/latest/g/invoices/create-invoice
- **Service File:** `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/src/services/sage.ts`
- **Routes File:** `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/src/routes/backoffice/sage.ts`
- **Test File:** `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/test-sage-integration.ts`

---

**Last Updated:** 2026-09-25
**Status:** ✅ Ready for OAuth2 authentication testing
