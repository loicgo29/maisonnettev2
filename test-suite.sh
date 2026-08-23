#!/bin/bash

# Master test suite orchestrator for maisonnettev2 + Authentik ecosystem
# Runs all test types: unit, E2E, BDD, API, security

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════════╗
║     maisonnettev2 + Authentik Ecosystem — Comprehensive Testing    ║
╚════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Color output for test results
print_result() {
  local status=$1
  local message=$2

  if [ $status -eq 0 ]; then
    echo -e "  ${GREEN}✅${NC} $message"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  elif [ $status -eq 2 ]; then
    echo -e "  ${YELLOW}⏭️ ${NC} $message (skipped)"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
  else
    echo -e "  ${RED}❌${NC} $message"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Check if services are available
check_services() {
  echo -e "${YELLOW}🔍 Checking services availability...${NC}"
  echo ""

  local frontend_status=1
  local backend_status=1
  local authentik_status=1

  if curl -s -m 2 http://localhost:5173 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Frontend (http://localhost:5173)"
    frontend_status=0
  else
    echo -e "  ${YELLOW}⚠️ ${NC} Frontend not running"
  fi

  if curl -s -m 2 http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Backend (http://localhost:3001)"
    backend_status=0
  else
    echo -e "  ${YELLOW}⚠️ ${NC} Backend not running"
  fi

  if curl -s -m 2 http://localhost:9000/-/health/live/ > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} Authentik IDP (http://localhost:9000)"
    authentik_status=0
  else
    echo -e "  ${YELLOW}⚠️ ${NC} Authentik IDP not running"
  fi

  echo ""

  if [ $frontend_status -eq 0 ] && [ $backend_status -eq 0 ] && [ $authentik_status -eq 0 ]; then
    return 0
  else
    return 1
  fi
}

# Run backend unit tests
run_backend_unit_tests() {
  echo -e "${BLUE}┌────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│   Backend Unit Tests               │${NC}"
  echo -e "${BLUE}└────────────────────────────────────┘${NC}"
  echo ""

  cd backend

  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    npm install -q
    echo ""
  fi

  if npm run test:unit > /tmp/backend-unit.log 2>&1; then
    print_result 0 "Backend unit tests"
  else
    print_result 1 "Backend unit tests"
    echo -e "${RED}    Error log:${NC}"
    tail -5 /tmp/backend-unit.log | sed 's/^/    /'
  fi

  cd ..
  echo ""
}

# Run frontend E2E tests
run_frontend_e2e_tests() {
  echo -e "${BLUE}┌────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│   Frontend E2E Tests (Playwright)  │${NC}"
  echo -e "${BLUE}└────────────────────────────────────┘${NC}"
  echo ""

  cd frontend

  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install -q
    echo ""
  fi

  if npm run test:e2e > /tmp/frontend-e2e.log 2>&1; then
    print_result 0 "Frontend E2E tests"
  else
    print_result 1 "Frontend E2E tests"
    tail -5 /tmp/frontend-e2e.log | sed 's/^/    /'
  fi

  cd ..
  echo ""
}

# Run BDD tests
run_bdd_tests() {
  echo -e "${BLUE}┌────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│   BDD Tests (Cucumber)             │${NC}"
  echo -e "${BLUE}└────────────────────────────────────┘${NC}"
  echo ""

  cd backend

  if npm run test:bdd > /tmp/backend-bdd.log 2>&1; then
    print_result 0 "BDD Cucumber tests"
  else
    print_result 1 "BDD Cucumber tests"
    tail -5 /tmp/backend-bdd.log | sed 's/^/    /'
  fi

  cd ..
  echo ""
}

# Run API integration tests
run_api_integration_tests() {
  echo -e "${BLUE}┌────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│   API Integration Tests            │${NC}"
  echo -e "${BLUE}└────────────────────────────────────┘${NC}"
  echo ""

  # Test health endpoints
  if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    print_result 0 "Backend health check"
  else
    print_result 1 "Backend health check"
  fi

  # Test Swagger docs
  if curl -s -f http://localhost:3001/api/docs > /dev/null 2>&1; then
    print_result 0 "Swagger API documentation"
  else
    print_result 1 "Swagger API documentation"
  fi

  # Test public endpoints
  if curl -s -f http://localhost:3001/api/gites > /dev/null 2>&1; then
    print_result 0 "Public /api/gites endpoint"
  else
    print_result 1 "Public /api/gites endpoint"
  fi

  # Test protected endpoints (should return 401)
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/reservations)" = "401" ]; then
    print_result 0 "Protected /api/reservations endpoint (401)"
  else
    print_result 1 "Protected /api/reservations endpoint (401)"
  fi

  # Test Authentik health
  if curl -s -f http://localhost:9000/-/health/live/ > /dev/null 2>&1; then
    print_result 0 "Authentik health check"
  else
    print_result 1 "Authentik health check"
  fi

  # Test OIDC discovery
  if curl -s -f "http://localhost:9000/application/o/maisonnettev2/.well-known/openid-configuration" > /dev/null 2>&1; then
    print_result 0 "OIDC configuration discovery"
  else
    print_result 1 "OIDC configuration discovery"
  fi

  echo ""
}

# Run security audits
run_security_audits() {
  echo -e "${BLUE}┌────────────────────────────────────┐${NC}"
  echo -e "${BLUE}│   Security Audits                  │${NC}"
  echo -e "${BLUE}└────────────────────────────────────┘${NC}"
  echo ""

  # Backend npm audit
  cd backend
  if npm audit --audit-level=moderate > /tmp/backend-audit.log 2>&1; then
    print_result 0 "Backend npm audit"
  else
    if grep -q "found 0 vulnerabilities" /tmp/backend-audit.log; then
      print_result 0 "Backend npm audit"
    else
      print_result 1 "Backend npm audit"
      grep "vulnerabilities" /tmp/backend-audit.log | head -2 | sed 's/^/    /'
    fi
  fi
  cd ..

  # Frontend npm audit
  cd frontend
  if npm audit --audit-level=moderate > /tmp/frontend-audit.log 2>&1; then
    print_result 0 "Frontend npm audit"
  else
    if grep -q "found 0 vulnerabilities" /tmp/frontend-audit.log; then
      print_result 0 "Frontend npm audit"
    else
      print_result 1 "Frontend npm audit"
      grep "vulnerabilities" /tmp/frontend-audit.log | head -2 | sed 's/^/    /'
    fi
  fi
  cd ..

  # Linting
  cd backend
  if npm run lint > /tmp/backend-lint.log 2>&1; then
    print_result 0 "Backend linting (ESLint)"
  else
    print_result 1 "Backend linting (ESLint)"
  fi
  cd ..

  cd frontend
  if npm run lint > /tmp/frontend-lint.log 2>&1; then
    print_result 0 "Frontend linting (ESLint)"
  else
    print_result 1 "Frontend linting (ESLint)"
  fi
  cd ..

  # Type checking
  cd backend
  if npm run typecheck > /tmp/backend-tsc.log 2>&1; then
    print_result 0 "Backend type checking (TypeScript)"
  else
    print_result 1 "Backend type checking (TypeScript)"
  fi
  cd ..

  cd frontend
  if npm run typecheck > /tmp/frontend-tsc.log 2>&1; then
    print_result 0 "Frontend type checking (TypeScript)"
  else
    print_result 1 "Frontend type checking (TypeScript)"
  fi
  cd ..

  echo ""
}

# Main execution
echo -e "${YELLOW}📊 Test Execution Plan${NC}"
echo ""
echo "  1. Check service availability"
echo "  2. Run backend unit tests"
echo "  3. Run frontend E2E tests"
echo "  4. Run BDD scenarios"
echo "  5. Run API integration tests"
echo "  6. Run security audits"
echo ""

# Check services
if check_services; then
  echo -e "${GREEN}✅ All services available - full test suite enabled${NC}"
  SERVICES_AVAILABLE=true
else
  echo -e "${YELLOW}⚠️  Some services unavailable - running partial test suite${NC}"
  echo -e "${YELLOW}   E2E and integration tests will be skipped${NC}"
  SERVICES_AVAILABLE=false
fi

echo ""

# Run tests
run_backend_unit_tests

if [ "$SERVICES_AVAILABLE" = true ]; then
  run_frontend_e2e_tests
  run_bdd_tests
  run_api_integration_tests
else
  SKIPPED_TESTS=$((SKIPPED_TESTS + 3))
  echo -e "${YELLOW}⏭️  Skipping E2E, BDD, and integration tests (services unavailable)${NC}"
  echo ""
fi

run_security_audits

# Summary
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                         TEST RESULTS SUMMARY                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "  Total Tests:  ${CYAN}$TOTAL_TESTS${NC}"
echo -e "  ${GREEN}✅ Passed:  $PASSED_TESTS${NC}"
echo -e "  ${RED}❌ Failed:  $FAILED_TESTS${NC}"
echo -e "  ${YELLOW}⏭️  Skipped: $SKIPPED_TESTS${NC}"
echo ""

PASS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
echo -e "  ${CYAN}Pass Rate:${NC} ${GREEN}$PASS_RATE%${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
  echo ""
  echo -e "${YELLOW}💡 Check /tmp/*.log files for detailed error output${NC}"
  echo ""
  exit 1
fi
