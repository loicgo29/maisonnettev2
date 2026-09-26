#!/bin/bash
# Test automatisé des routes protégées par OAuth2/Keycloak
#
# Usage:
#   ./scripts/test-oauth2-routes.sh                           # Test contre prod
#   ./scripts/test-oauth2-routes.sh http://localhost:8030     # Test local
#   ./scripts/test-oauth2-routes.sh --ci                      # Mode CI (exit code non-zéro = fail)

set -e

# Config
BASE_URL="${1:-https://maisonnette-pecheur-bertheaume.fr}"
CI_MODE="${2:-}"

# Charger les variables d'env
if [ -f .env.production ]; then
    export $(grep '^OAUTH2_CLIENT_ID\|^OAUTH2_CLIENT_SECRET' .env.production | xargs)
elif [ -f .env ]; then
    export $(grep '^OAUTH2_CLIENT_ID\|^OAUTH2_CLIENT_SECRET' .env | xargs)
fi

echo "🧪 Test OAuth2/Keycloak — Routes protégées"
echo "Base URL: $BASE_URL"
echo ""

# Obtenir un token
echo "1️⃣  Obtention du token..."
TOKEN=$(./scripts/get-keycloak-token.sh logo-back admin123 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "❌ Impossible d'obtenir un token"
    echo "   Vérifiez OAUTH2_CLIENT_SECRET et les credentials Keycloak"
    exit 1
fi

echo "✅ Token obtenu"
echo ""

# Tests
TESTS_PASSED=0
TESTS_FAILED=0

test_route() {
    local METHOD="$1"
    local ROUTE="$2"
    local EXPECTED_STATUS="$3"
    local WITH_AUTH="$4"

    echo -n "  $METHOD $ROUTE → "

    if [ "$WITH_AUTH" = "auth" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" \
            -H "Cookie: _oauth2_proxy=${TOKEN}" \
            "${BASE_URL}${ROUTE}")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "${BASE_URL}${ROUTE}")
    fi

    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
        echo "✅ $STATUS"
        ((TESTS_PASSED++))
    else
        echo "❌ $STATUS (attendu $EXPECTED_STATUS)"
        ((TESTS_FAILED++))
        [ "$CI_MODE" = "--ci" ] && echo "   Body: $(echo "$BODY" | head -c 100)..."
    fi
}

echo "2️⃣  Tests sans authentification (401 attendu):"
test_route GET "/admin" 401 noauth
test_route GET "/admin/alo" 401 noauth
test_route GET "/admin/comptabilite" 401 noauth
echo ""

echo "3️⃣  Tests avec authentification (200 attendu, ou 502 si service down):"
test_route GET "/admin" "200\|502" auth
test_route GET "/admin/alo" "200\|502" auth
test_route GET "/admin/comptabilite" "200\|502" auth
echo ""

echo "4️⃣  Routes publiques (200 attendu, pas d'auth):"
test_route GET "/" 200 noauth
test_route GET "/api/calendar/public" "200\|404" noauth
echo ""

echo ""
echo "📊 Résultat: $TESTS_PASSED ✅ / $TESTS_FAILED ❌"

if [ $TESTS_FAILED -gt 0 ]; then
    [ "$CI_MODE" = "--ci" ] && exit 1
    exit 0
fi
