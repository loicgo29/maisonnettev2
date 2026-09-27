#!/bin/bash
# Script de test SNR (Hetzner) - Vérifie health, auth, Sage OAuth
# Documente tous les tests et problèmes pour enrichissement itératif
# Usage: ./test-hetzner-health.sh [--verbose] [--output file.log]

set -e

HETZNER_URL="${HETZNER_URL:-https://maisonnette-pecheur-bertheaume.fr}"
VERBOSE=false
OUTPUT_FILE="/tmp/hetzner-test-$(date +%Y%m%d-%H%M%S).log"
RESULTS_FILE="hetzner-test-results.md"

while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose) VERBOSE=true; shift ;;
    --output) OUTPUT_FILE="$2"; shift 2 ;;
    *) echo "Usage: $0 [--verbose] [--output file.log]"; exit 1 ;;
  esac
done

# Coleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonctions helpers
log() {
  local level=$1
  shift
  local msg="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  case $level in
    OK)
      echo -e "${GREEN}✅${NC} [$timestamp] $msg" | tee -a "$OUTPUT_FILE"
      ;;
    ERROR)
      echo -e "${RED}❌${NC} [$timestamp] $msg" | tee -a "$OUTPUT_FILE"
      ;;
    INFO)
      echo -e "${YELLOW}ℹ️${NC} [$timestamp] $msg" | tee -a "$OUTPUT_FILE"
      ;;
    DEBUG)
      if [ "$VERBOSE" = true ]; then
        echo -e "🔍 [$timestamp] $msg" | tee -a "$OUTPUT_FILE"
      fi
      ;;
  esac
}

test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_code=$3
  local name=$4
  local data=${5:-}

  log INFO "Testing: $name"

  local cmd="curl -s -X $method '$HETZNER_URL$endpoint' -H 'Content-Type: application/json' -w '\n%{http_code}' -o /tmp/response.txt"

  if [ ! -z "$data" ]; then
    cmd="$cmd -d '$data'"
  fi

  log DEBUG "Command: $cmd"

  eval $cmd > /tmp/http_code.txt 2>&1
  local http_code=$(cat /tmp/http_code.txt | tail -1)
  local response=$(cat /tmp/response.txt)

  if [ "$http_code" = "$expected_code" ]; then
    log OK "$name — HTTP $http_code"
    if [ "$VERBOSE" = true ] && [ ! -z "$response" ]; then
      log DEBUG "Response: $response"
    fi
    return 0
  else
    log ERROR "$name — Expected $expected_code, got $http_code"
    log ERROR "Response: $response"
    return 1
  fi
}

# === TESTS START ===

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee "$OUTPUT_FILE"
echo "🧪 SNR Health Check Suite" | tee -a "$OUTPUT_FILE"
echo "Target: $HETZNER_URL" | tee -a "$OUTPUT_FILE"
echo "Started: $(date)" | tee -a "$OUTPUT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$OUTPUT_FILE"

PASSED=0
FAILED=0

# 1. Frontend Health
echo "" | tee -a "$OUTPUT_FILE"
log INFO "=== FRONTEND TESTS ==="
if test_endpoint "GET" "/" "200" "Frontend Homepage"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# 2. Backend Health Checks
echo "" | tee -a "$OUTPUT_FILE"
log INFO "=== BACKEND HEALTH CHECKS ==="

if test_endpoint "GET" "/api/health" "200" "Backend Health"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# 3. Authentication Tests
echo "" | tee -a "$OUTPUT_FILE"
log INFO "=== AUTHENTICATION TESTS ==="

# Test login endpoint (should accept POST)
if test_endpoint "POST" "/api/backoffice/auth/login" "200" "Backoffice Login Endpoint Exists" '{"username":"admin","password":"admin123"}'; then
  ((PASSED++))
else
  log ERROR "Login endpoint failed — backend may not be responding"
  ((FAILED++))
fi

# 4. Sage OAuth Tests (NEW)
echo "" | tee -a "$OUTPUT_FILE"
log INFO "=== SAGE OAUTH TESTS ==="

if test_endpoint "POST" "/api/admin/comptabilite/oauth/health" "200" "Sage Health Check" '{}'; then
  ((PASSED++))
  log OK "Sage OAuth service is accessible"
else
  log ERROR "Sage OAuth not responding — may be missing or not deployed"
  ((FAILED++))
fi

# Try to get authorization URL (should work even without Bitwarden secrets)
if test_endpoint "POST" "/api/admin/comptabilite/oauth/authorize" "200" "Sage Authorization URL Generation" '{"state":"test-state"}'; then
  ((PASSED++))
  log OK "Sage can generate authorization URLs"
else
  log ERROR "Sage authorize endpoint failed"
  ((FAILED++))
fi

# 5. Calendar Tests
echo "" | tee -a "$OUTPUT_FILE"
log INFO "=== CALENDAR TESTS ==="

if test_endpoint "GET" "/api/calendar/public" "200" "Public Calendar Endpoint" ; then
  ((PASSED++))
else
  log ERROR "Public calendar endpoint failed"
  ((FAILED++))
fi

# === RESULTS ===

echo "" | tee -a "$OUTPUT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$OUTPUT_FILE"
log INFO "SUMMARY: $PASSED passed, $FAILED failed"
echo "Completed: $(date)" | tee -a "$OUTPUT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$OUTPUT_FILE"

# Save results to markdown for history
cat >> "$RESULTS_FILE" << EOF

## Test Run — $(date '+%Y-%m-%d %H:%M:%S')

**Target:** $HETZNER_URL
**Results:** $PASSED passed, $FAILED failed

$(if [ $FAILED -eq 0 ]; then echo "✅ **ALL TESTS PASSED**"; else echo "❌ **$FAILED TESTS FAILED**"; fi)

### Log
\`\`\`
$(cat "$OUTPUT_FILE")
\`\`\`

---

EOF

log INFO "Full results saved to: $OUTPUT_FILE"
log INFO "History saved to: $RESULTS_FILE"

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
