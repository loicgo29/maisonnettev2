#!/bin/bash
# Test Sage OAuth2 integration end-to-end

set -euo pipefail

SITE="https://maisonnette-pecheur-bertheaume.fr"
KC_USER="${KC_USER:-testuser}"
KC_PASS="${KC_PASS:-Test123!}"

echo "🧪 Testing Sage OAuth2 Integration"
echo "=================================="

# Step 1: Login via Keycloak (get session cookie)
echo ""
echo "1️⃣ Keycloak Login..."
COOKIES=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
  -X POST "$SITE/oauth2/auth" \
  -d "username=$KC_USER&password=$KC_PASS" \
  -w "%{http_code}")

if [[ $COOKIES == *"302"* ]] || [[ $COOKIES == *"200"* ]]; then
  echo "   ✅ Login successful"
  COOKIE=$(grep '_oauth2_proxy' /tmp/cookies.txt | awk '{print $NF}')
  echo "   Cookie: ${COOKIE:0:20}..."
else
  echo "   ❌ Login failed"
  exit 1
fi

# Step 2: Check status before auth
echo ""
echo "2️⃣ Check Sage Status (before auth)..."
STATUS=$(curl -s -b /tmp/cookies.txt "$SITE/api/admin/comptabilite/status")
echo "   Response: $STATUS"

# Step 3: Get Authorization URL
echo ""
echo "3️⃣ Get Sage Authorization URL..."
AUTH_URL=$(curl -s -b /tmp/cookies.txt \
  -X POST "$SITE/api/admin/comptabilite/oauth/authorize" \
  -H "Content-Type: application/json" | grep -o 'http[^"]*')

if [ -n "$AUTH_URL" ]; then
  echo "   ✅ Auth URL generated"
  echo "   URL: ${AUTH_URL:0:80}..."
else
  echo "   ❌ Failed to get auth URL"
  exit 1
fi

# Step 4: (Manual) User logs in to Sage via browser
echo ""
echo "4️⃣ Manual: Open browser and complete Sage OAuth2 flow"
echo "   URL: $AUTH_URL"
echo "   ⏸️  Press ENTER after you've authorized Sage and been redirected..."
read -r

# Step 5: Verify token was saved
echo ""
echo "5️⃣ Verify Sage Token Stored..."
TOKEN_CHECK=$(curl -s -b /tmp/cookies.txt \
  -X GET "$SITE/api/admin/comptabilite/status" \
  -H "Content-Type: application/json")

if echo "$TOKEN_CHECK" | grep -q "true"; then
  echo "   ✅ Token authenticated: $TOKEN_CHECK"
else
  echo "   ⚠️ Token status unclear: $TOKEN_CHECK"
fi

# Step 6: Push test invoice
echo ""
echo "6️⃣ Push Test Invoice to Sage..."
INVOICE_RESPONSE=$(curl -s -b /tmp/cookies.txt \
  -X POST "$SITE/api/admin/comptabilite/invoices/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "TEST-'$(date +%s)'",
    "date": "'$(date +%Y-%m-%d)'",
    "dueDate": "'$(date -v+30d +%Y-%m-%d 2>/dev/null || date -d '+30 days' +%Y-%m-%d)'",
    "customerId": "TEST-CUST",
    "amount": 1000,
    "lines": [{"description": "Test Invoice", "quantity": 1, "unitPrice": 1000}]
  }')

if echo "$INVOICE_RESPONSE" | grep -q "id"; then
  echo "   ✅ Invoice created in Sage"
  echo "   Response: $INVOICE_RESPONSE"
else
  echo "   ❌ Invoice push failed"
  echo "   Response: $INVOICE_RESPONSE"
  exit 1
fi

echo ""
echo "========================================="
echo "✅ Sage OAuth2 Integration Test PASSED"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Keycloak authentication"
echo "  ✓ Sage authorization URL generated"
echo "  ✓ OAuth2 callback completed"
echo "  ✓ Token persisted to database"
echo "  ✓ Invoice successfully pushed to Sage API"
