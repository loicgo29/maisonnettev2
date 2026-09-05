#!/bin/bash

# maisonnettev2 — Full Stack Startup Script
# Usage: ./startup.sh
# Starts: IDP + maisonnettev2 (postgres, backend, frontend)
# Then: Healthcheck all services
# Then: Run tests (BDD optional)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_DIR="$(dirname "$SCRIPT_DIR")"
IDP_DIR="$PROJECTS_DIR/idp"
APP_DIR="$SCRIPT_DIR"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🚀 maisonnettev2 STARTUP${NC}"
echo "$TIMESTAMP"
echo -e "${YELLOW}========================================${NC}"

# Function to print status
print_status() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

print_step() {
  echo -e "${YELLOW}📌 $1${NC}"
}

# ============================================
# STEP 1: Start IDP (Authentik)
# ============================================
print_step "Step 1: Starting IDP (Authentik)..."
cd "$IDP_DIR"

if docker-compose ps | grep -q "idp-authentik-server"; then
  print_status "IDP already running"
else
  docker-compose up -d
  print_status "IDP started (postgres, redis, authentik)"
fi

# ============================================
# STEP 2: Start maisonnettev2 Stack
# ============================================
print_step "Step 2: Starting maisonnettev2 stack..."
cd "$APP_DIR"

docker-compose up -d
print_status "Services launched (postgres-maisonnettev2, backend, frontend)"

# Wait for services to stabilize
print_step "Waiting 15 seconds for services to stabilize..."
sleep 15

# ============================================
# STEP 3: Healthcheck All Services
# ============================================
print_step "Step 3: Running healthchecks..."
echo ""

HEALTHY=0
TOTAL=0

check_health() {
  local name=$1
  local url=$2
  TOTAL=$((TOTAL + 1))

  if curl -s -m 5 "$url" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} $name"
    HEALTHY=$((HEALTHY + 1))
  else
    echo -e "  ${RED}❌${NC} $name — unreachable"
  fi
}

echo "IDP Services:"
check_health "Authentik Health API" "http://localhost:9000/-/health/live/"
check_health "Authentik Admin UI" "http://localhost:9000/if/admin/"

echo ""
echo "maisonnettev2 Services:"
check_health "Frontend" "http://localhost:5173/"
check_health "Backend API Docs" "http://localhost:3001/api/docs"
check_health "Backend Health" "http://localhost:3001/health"

echo ""
if [ $HEALTHY -eq $TOTAL ]; then
  echo -e "${GREEN}✅ All services healthy ($HEALTHY/$TOTAL)${NC}"
else
  echo -e "${YELLOW}⚠️  Some services unreachable ($HEALTHY/$TOTAL)${NC}"
fi

# ============================================
# STEP 4: Run Tests (Optional - BDD)
# ============================================
print_step "Step 4: Running tests..."
echo ""

read -p "Run BDD tests? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd "$APP_DIR/backend"
  echo "Running BDD tests (this requires DATABASE_URL)..."
  DATABASE_URL="postgresql://postgres:password@localhost:5433/maisonnettev2" \
    npm run test:bdd -- --require-module tsx --require 'features/step_definitions/**/*.ts' 2>&1 | tail -50
  print_status "BDD tests complete"
else
  echo "Skipping BDD tests"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 STARTUP COMPLETE${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "🌐 Open browser:"
echo "   Frontend:      http://localhost:5173"
echo "   Backend Docs:  http://localhost:3001/api/docs"
echo "   Authentik:     http://localhost:9000/if/admin/"
echo ""
echo "📊 Monitor services:"
echo "   ./healthcheck.sh              (one-time check)"
echo "   watch ./healthcheck.sh        (continuous)"
echo ""
echo "🧪 Run tests:"
echo "   cd backend && npm run test    (unit tests)"
echo "   cd frontend && npm run test   (unit tests)"
echo "   cd frontend && npm run test:e2e (E2E tests)"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
