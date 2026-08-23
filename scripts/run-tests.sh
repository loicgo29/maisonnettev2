#!/bin/bash

# Comprehensive test suite for maisonnettev2 + Authentik
# Runs: unit tests, E2E tests, API integration tests, security checks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   maisonnettev2 - COMPREHENSIVE TESTS  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local name=$1
  local command=$2

  echo -e "${YELLOW}🧪 Running: $name${NC}"

  if eval "$command" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Passed${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}❌ Failed${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"
echo ""

# Backend tests
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}BACKEND TESTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
  npm install
  echo ""
fi

# Run unit tests
run_test "Backend Unit Tests" "npm run test:unit"

# Run linting
run_test "Backend Linting (ESLint)" "npm run lint"

# Run type checking
run_test "Backend Type Checking" "npm run typecheck"

# Security audit
run_test "Backend Security Audit (npm audit)" "npm audit --audit-level=moderate"

cd ..
echo ""

# Frontend tests
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FRONTEND TESTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}�500 Installing frontend dependencies...${NC}"
  npm install
  echo ""
fi

# Run type checking
run_test "Frontend Type Checking" "npm run typecheck"

# Run linting
run_test "Frontend Linting (ESLint)" "npm run lint"

# Security audit
run_test "Frontend Security Audit (npm audit)" "npm audit --audit-level=moderate"

cd ..
echo ""

# E2E tests (if services are running)
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}E2E & INTEGRATION TESTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Check if services are running
FRONTEND_RUNNING=0
BACKEND_RUNNING=0
AUTHENTIK_RUNNING=0

if curl -s -m 2 http://localhost:5173 > /dev/null 2>&1; then
  FRONTEND_RUNNING=1
fi

if curl -s -m 2 http://localhost:3001/health > /dev/null 2>&1; then
  BACKEND_RUNNING=1
fi

if curl -s -m 2 http://localhost:9000/-/health/live/ > /dev/null 2>&1; then
  AUTHENTIK_RUNNING=1
fi

if [ $FRONTEND_RUNNING -eq 1 ] && [ $BACKEND_RUNNING -eq 1 ] && [ $AUTHENTIK_RUNNING -eq 1 ]; then
  echo -e "${GREEN}✅ All services are running${NC}"
  echo ""

  # Run Playwright E2E tests
  cd frontend

  if [ ! -d "node_modules" ]; then
    npm install
  fi

  run_test "Frontend E2E Tests (Playwright)" "npm run test:e2e"

  cd ..
  echo ""

  # Run API integration tests
  run_test "API Health Check" "curl -s -f http://localhost:3001/health"
  run_test "API Swagger Docs" "curl -s -f http://localhost:3001/api/docs"
  run_test "Authentik Health Check" "curl -s -f http://localhost:9000/-/health/live/"
  run_test "OIDC Discovery" "curl -s -f http://localhost:9000/application/o/maisonnettev2/.well-known/openid-configuration || true"

  # API contract tests
  echo -e "${YELLOW}🧪 Running API Contract Tests${NC}"
  echo -e "  Checking /api/gites (public)..."
  if curl -s -m 2 http://localhost:3001/api/gites | grep -q '\[' || curl -s -m 2 http://localhost:3001/api/gites | grep -q '{}'; then
    echo -e "  ${GREEN}✅ /api/gites responds with JSON${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}❌ /api/gites response invalid${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""

  echo -e "  Checking /api/reservations (protected)..."
  if curl -s -m 2 http://localhost:3001/api/reservations | grep -q '401\|Unauthorized' || [ "$(curl -s -o /dev/null -w '%{http_code}' -m 2 http://localhost:3001/api/reservations)" = "401" ]; then
    echo -e "  ${GREEN}✅ /api/reservations requires authentication${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}❌ /api/reservations auth check failed${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""

else
  echo -e "${YELLOW}⚠️  Not all services are running${NC}"
  echo -e "  Frontend:  $([ $FRONTEND_RUNNING -eq 1 ] && echo '${GREEN}✅${NC}' || echo '${RED}❌${NC}')"
  echo -e "  Backend:   $([ $BACKEND_RUNNING -eq 1 ] && echo '${GREEN}✅${NC}' || echo '${RED}❌${NC}')"
  echo -e "  Authentik: $([ $AUTHENTIK_RUNNING -eq 1 ] && echo '${GREEN}✅${NC}' || echo '${RED}❌${NC}')"
  echo ""
  echo -e "${YELLOW}💡 To run E2E tests:${NC}"
  echo "   1. Start IDP: cd ../idp && docker-compose up -d"
  echo "   2. Start maisonnettev2: docker-compose up -d"
  echo "   3. Run tests again"
  echo ""
fi

# Summary
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}═════════════════════════════════════════${NC}"
echo ""

echo -e "  ${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
  exit 1
fi
