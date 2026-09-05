#!/bin/bash
# Validation Suite: Garantit que "READY" signifie vraiment prêt
# Lance TOUS les tests avant d'autoriser le "ready"

set -e

echo "🧪 MASTER VALIDATION SUITE"
echo "======================================"
echo ""

FAILED=0

# 1. Env validation
echo "1️⃣ Environment validation..."
if bash tests/integration/validate-env-consistency.sh > /dev/null 2>&1; then
  echo "✅ Environment PASS"
else
  echo "❌ Environment FAIL"
  FAILED=$((FAILED+1))
fi

# 2. TypeScript
echo "2️⃣ TypeScript compilation..."
if cd backend && npm run build 2>&1 | tee /tmp/ts-build.log && cd ..; then
  echo "✅ TypeScript PASS"
else
  echo "❌ TypeScript FAIL"
  echo "   Error output:"
  tail -20 /tmp/ts-build.log | sed 's/^/   /'
  FAILED=$((FAILED+1))
fi

# 3. ESLint
echo "3️⃣ ESLint linting..."
if cd backend && npm run lint > /dev/null 2>&1 && cd ..; then
  echo "✅ ESLint PASS"
else
  echo "❌ ESLint FAIL"
  FAILED=$((FAILED+1))
fi

# 4. Docker services
echo "4️⃣ Starting Docker services..."
docker compose up -d > /dev/null 2>&1
sleep 15

# 5. Frontend responds
echo "5️⃣ Frontend HTTP response..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "✅ Frontend PASS"
else
  echo "❌ Frontend FAIL (not responding)"
  FAILED=$((FAILED+1))
fi

# 6. Backend API
echo "6️⃣ Backend API response..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Backend PASS"
else
  echo "❌ Backend FAIL (not responding)"
  FAILED=$((FAILED+1))
fi

# 6b. Calendar endpoint (FEATURE TEST)
echo "6b️⃣ Calendar endpoint returns valid response..."
CALENDAR_RESPONSE=$(curl -s http://localhost:3001/api/calendar)
if echo "$CALENDAR_RESPONSE" | grep -q '"authUrl"'; then
  echo "✅ Calendar endpoint PASS (authUrl provided)"
elif echo "$CALENDAR_RESPONSE" | grep -q '"error":"Configuration Google Calendar manquante"'; then
  echo "⚠️ Calendar endpoint WARNING: Google Calendar not configured"
  echo "   Set: PRIVATE_GOOGLE_CLIENT_ID, PRIVATE_GOOGLE_CLIENT_SECRET, PRIVATE_GOOGLE_REDIRECT_URI"
  FAILED=$((FAILED+1))
elif echo "$CALENDAR_RESPONSE" | grep -q '"error"'; then
  ERROR_MSG=$(echo "$CALENDAR_RESPONSE" | grep -o '"error":"[^"]*"')
  echo "❌ Calendar endpoint FAIL: $ERROR_MSG"
  FAILED=$((FAILED+1))
else
  echo "❌ Calendar endpoint FAIL (invalid response: $CALENDAR_RESPONSE)"
  FAILED=$((FAILED+1))
fi

# 7. Production test
echo "7️⃣ Production endpoint (Hetzner)..."
if ssh -i ~/.ssh/maisonnettev2_hetzner deploy@maisonnette-pecheur-bertheaume.fr "curl -s http://localhost:8030/api/backoffice/meals/accounts" | grep -q "gourmich" 2>/dev/null; then
  echo "✅ Production PASS"
else
  echo "❌ Production FAIL"
  FAILED=$((FAILED+1))
fi

echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASS - READY FOR PRODUCTION ✅"
  echo ""
  exit 0
else
  echo "❌ $FAILED TEST(S) FAILED - NOT READY"
  echo "Fix failures and run again"
  echo ""
  exit 1
fi
