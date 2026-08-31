#!/bin/bash
set -euo pipefail

echo "🚀 === PRE-DEPLOYMENT CHECKLIST ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0

# Check 1: .env file exists
echo "✓ Checking .env.production..."
if [ ! -f ".env.production" ]; then
  echo -e "${RED}✗ .env.production not found${NC}"
  echo "  Run: ./setup-env.sh --prod"
  ((errors++))
else
  echo -e "${GREEN}✓ .env.production exists${NC}"
fi

# Check 2: All critical env vars present
echo ""
echo "✓ Checking environment variables..."
required_vars=(
  "PRIVATE_GOOGLE_CLIENT_ID"
  "PRIVATE_GOOGLE_CLIENT_SECRET"
  "PRIVATE_GOOGLE_REDIRECT_URI"
  "PRIVATE_GITE_CALENDAR_ID"
  "DB_PASSWORD"
  "KC_DB_PASSWORD"
  "KC_ADMIN_PASSWORD"
  "KEYCLOAK_REALM_URL"
  "PUBLIC_AUTH_URL"
  "PUBLIC_AUTH_CLIENT_ID"
)

for var in "${required_vars[@]}"; do
  if grep -q "^${var}=" .env.production; then
    value=$(grep "^${var}=" .env.production | cut -d= -f2 | cut -c1-20)
    echo -e "${GREEN}✓${NC} $var=${value}..."
  else
    echo -e "${RED}✗ Missing: ${var}${NC}"
    ((errors++))
  fi
done

# Check 3: docker-compose.prod.yml has no_cache
echo ""
echo "✓ Checking docker-compose.prod.yml configuration..."
if grep -q "no_cache: true" docker-compose.prod.yml; then
  echo -e "${GREEN}✓${NC} no_cache: true configured"
else
  echo -e "${RED}✗ no_cache: true NOT configured${NC}"
  echo "  This may cause stale build cache issues!"
  ((errors++))
fi

# Check 4: Validate REDIRECT_URI format
echo ""
echo "✓ Validating URL formats..."
if grep -q "PRIVATE_GOOGLE_REDIRECT_URI=https://" .env.production; then
  echo -e "${GREEN}✓${NC} PRIVATE_GOOGLE_REDIRECT_URI has HTTPS"
else
  echo -e "${YELLOW}⚠${NC} PRIVATE_GOOGLE_REDIRECT_URI may not be HTTPS"
fi

# Check 5: Summary
echo ""
if [ $errors -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✓ ALL CHECKS PASSED - SAFE TO DEPLOY${NC}"
  echo -e "${GREEN}========================================${NC}"
  exit 0
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}✗ $errors ISSUE(S) FOUND${NC}"
  echo -e "${RED}========================================${NC}"
  exit 1
fi
