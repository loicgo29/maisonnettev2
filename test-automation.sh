#!/bin/bash

# test-automation.sh — Automated E2E Testing with Claude in Chrome
# Usage: ./test-automation.sh [--headless] [--debug]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  E2E Test Automation with Claude in Chrome ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
HEADLESS=false
DEBUG=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --headless) HEADLESS=true; shift ;;
    --debug) DEBUG=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ============ STARTUP CHECKS ============
echo -e "${YELLOW}📋 Startup Checks${NC}"
echo ""

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "  ${GREEN}✅${NC} Backend running on :3001"
else
  echo -e "  ${YELLOW}⚠️${NC}  Backend not running. Starting..."
  cd backend
  npm run dev > /tmp/backend.log 2>&1 &
  BACKEND_PID=$!
  sleep 5
  cd ..
fi

# Check if frontend is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "  ${GREEN}✅${NC} Frontend running on :5173"
else
  echo -e "  ${YELLOW}⚠️${NC}  Frontend not running. Starting..."
  npm run dev > /tmp/frontend.log 2>&1 &
  FRONTEND_PID=$!
  sleep 10
fi

# Check if Keycloak is running
if curl -s http://localhost:9001/realms/maisonnettev2 > /dev/null 2>&1; then
  echo -e "  ${GREEN}✅${NC} Keycloak running on :9001"
else
  echo -e "  ${RED}❌${NC} Keycloak not running. Skipping auth tests."
fi

echo ""

# ============ TEST EXECUTION ============
echo -e "${YELLOW}🧪 Running E2E Tests${NC}"
echo ""

if [ "$HEADLESS" = true ]; then
  echo "Mode: Headless"
  npx playwright test --project=chromium --headed=false
else
  echo "Mode: Headed (Chrome visible)"
  npx playwright test --project=chromium --headed=true
fi

# ============ RESULTS ============
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          TEST EXECUTION COMPLETE           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Generate report if tests completed
if [ -f "playwright-report/index.html" ]; then
  echo -e "${GREEN}📊 Test Report:${NC} playwright-report/index.html"
  echo ""
  echo "To view the report:"
  echo "  npx playwright show-report"
fi

# Cleanup background processes
if [ ! -z "$BACKEND_PID" ]; then
  echo "Cleaning up backend process..."
  kill $BACKEND_PID 2>/dev/null || true
fi

if [ ! -z "$FRONTEND_PID" ]; then
  echo "Cleaning up frontend process..."
  kill $FRONTEND_PID 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✅ Test automation complete!${NC}"
