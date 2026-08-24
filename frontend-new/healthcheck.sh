#!/bin/bash

# Healthcheck script pour maisonnettev2 frontend
# Teste les endpoints critiques après redémarrage

HOST="${1:-http://localhost:8030}"
TIMEOUT=5

echo "🏥 Healthcheck: $HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

check_endpoint() {
    local endpoint=$1
    local description=$2
    local method=${3:-GET}

    echo -n "🔍 $description ($endpoint)... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$HOST$endpoint" 2>/dev/null)
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)
    else
        http_code=$(curl -s -w "%{http_code}" -X $method --max-time $TIMEOUT "$HOST$endpoint" -o /dev/null 2>/dev/null)
    fi

    if [ "$http_code" = "200" ] || [ "$http_code" = "404" ] || [ "$http_code" = "302" ]; then
        echo -e "${GREEN}✓ HTTP $http_code${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ HTTP $http_code${NC}"
        ((FAILED++))
    fi
}

# Tests
check_endpoint "/" "Page d'accueil"
check_endpoint "/calendar" "Page calendrier"
check_endpoint "/api/calendar" "API calendrier"
check_endpoint "/api/gites" "API gîtes"
check_endpoint "/api/reservations" "API réservations"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Passed: $PASSED${NC} | ${RED}✗ Failed: $FAILED${NC}"

if [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Certains endpoints ne répondent pas${NC}"
    exit 1
else
    echo -e "${GREEN}🚀 Tous les endpoints OK !${NC}"
    exit 0
fi
