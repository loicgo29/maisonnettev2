#!/bin/bash

# OAuth2 401 Diagnostic Script
# Automatically diagnoses why admin login is returning 401

set -e

echo "🔍 OAuth2 401 Diagnosis — Starting..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

# Check 1: Frontend is running
echo -e "${BLUE}[1/8]${NC} Checking frontend..."
if curl -s http://localhost:8030/admin > /dev/null; then
  echo -e "${GREEN}✓${NC} Frontend responding"
else
  echo -e "${RED}✗${NC} Frontend not responding"
  exit 1
fi

# Check 2: Backend is running
echo -e "${BLUE}[2/8]${NC} Checking backend..."
if curl -s http://localhost:3001/health > /dev/null; then
  echo -e "${GREEN}✓${NC} Backend responding"
else
  echo -e "${RED}✗${NC} Backend not responding"
  exit 1
fi

# Check 3: Backend can reach Authentik JWKS
echo -e "${BLUE}[3/8]${NC} Checking Authentik JWKS availability..."
JWKS_URL="https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2/certs"
if curl -s -k "$JWKS_URL" | grep -q "keys"; then
  echo -e "${GREEN}✓${NC} Authentik JWKS accessible"
else
  echo -e "${RED}✗${NC} Authentik JWKS not accessible"
  echo "   This is likely the problem!"
fi

# Check 4: Backend environment
echo -e "${BLUE}[4/8]${NC} Checking backend OIDC configuration..."
KEYCLOAK_REALM=$(docker exec maisonnette-test-backend sh -c 'echo $KEYCLOAK_REALM_URL' 2>/dev/null || echo "NOT SET")
echo "   KEYCLOAK_REALM_URL=$KEYCLOAK_REALM"

if [[ "$KEYCLOAK_REALM" == *"auth.maisonnette"* ]]; then
  echo -e "${GREEN}✓${NC} Using Authentik (correct)"
else
  echo -e "${RED}✗${NC} Not pointing to Authentik"
fi

# Check 5: Backend can access database
echo -e "${BLUE}[5/8]${NC} Checking database connectivity..."
DB_STATUS=$(docker exec maisonnette-test-backend sh -c 'curl -s http://localhost:3001/health' | grep -o '"status":"[^"]*"' || echo "error")
if [[ "$DB_STATUS" == *"ok"* ]] || [[ "$DB_STATUS" == "" ]]; then
  echo -e "${GREEN}✓${NC} Backend database accessible"
else
  echo -e "${YELLOW}⚠${NC} Database status: $DB_STATUS"
fi

# Check 6: Test request with valid JWT format
echo -e "${BLUE}[6/8]${NC} Testing API with sample JWT..."
SAMPLE_JWT="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.signature"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $SAMPLE_JWT" http://localhost:3001/api/admin/dashboard)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "   Response code: $HTTP_CODE"
if [[ "$HTTP_CODE" == "401" ]]; then
  echo -e "${YELLOW}⚠${NC} Got 401 (expected for invalid token)"
  echo "   Error: $(echo "$BODY" | grep -o '"error":"[^"]*"' || echo "unknown")"
elif [[ "$HTTP_CODE" == "500" ]]; then
  echo -e "${RED}✗${NC} Got 500 (server error - check logs)"
  echo "   Error: $(echo "$BODY" | grep -o '"error":"[^"]*"' || echo "unknown")"
else
  echo -e "${GREEN}✓${NC} Got $HTTP_CODE (unexpected but not 500)"
fi

# Check 7: Backend logs
echo -e "${BLUE}[7/8]${NC} Checking recent backend logs..."
RECENT_LOGS=$(docker logs maisonnette-test-backend 2>&1 | grep -i "oidc\|error" | tail -5)
if [[ -z "$RECENT_LOGS" ]]; then
  echo -e "${YELLOW}⚠${NC} No OIDC-related logs found"
  echo "   (Run: docker logs maisonnette-test-backend | grep OIDC)"
else
  echo "$RECENT_LOGS"
fi

# Check 8: Frontend sessionStorage
echo -e "${BLUE}[8/8]${NC} Checking frontend token storage..."
echo "   (Check browser DevTools console for [AUTH] and [API] logs)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Diagnosis Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Determine most likely issue
if [[ "$KEYCLOAK_REALM" != *"auth.maisonnette"* ]]; then
  echo -e "${RED}🔴 LIKELY ISSUE:${NC} Backend not configured to use Authentik"
  echo "   Fix: Update KEYCLOAK_REALM_URL in backend/.env"
  echo "   To: https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2/"
  echo "   Then restart backend"
elif ! curl -s -k "$JWKS_URL" > /dev/null 2>&1; then
  echo -e "${RED}🔴 LIKELY ISSUE:${NC} Backend cannot reach Authentik JWKS"
  echo "   Fix: Check network connectivity from backend container to Authentik"
  echo "   Or: Check Authentik is running and JWKS URL is correct"
else
  echo -e "${YELLOW}🟡 UNCLEAR ISSUE:${NC} No obvious configuration problems detected"
  echo "   Next steps:"
  echo "   1. Check browser console (F12) for [AUTH] and [API] logs"
  echo "   2. Check backend logs: docker logs maisonnette-test-backend"
  echo "   3. Test Authentik login manually"
  echo "   4. Verify token format is valid JWT"
fi

echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  # Watch backend logs"
echo "  docker logs -f maisonnette-test-backend 2>&1 | grep OIDC"
echo ""
echo "  # Test backend directly with curl"
echo "  curl -i -H 'Authorization: Bearer <TOKEN>' http://localhost:3001/api/admin/dashboard"
echo ""
echo "  # Check Authentik JWKS"
echo "  curl -k https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2/certs | jq ."
echo ""
