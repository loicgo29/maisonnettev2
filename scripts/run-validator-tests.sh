#!/bin/bash
# E2E Validator Tests — Run real browser tests before claiming "ready"

echo "🧪 E2E VALIDATOR TESTS"
echo "======================================"
echo ""

# Ensure services are running
echo "✅ Services should already be running (docker compose up -d)"
echo ""

# Check if services are healthy
echo "Checking service health..."
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "❌ Backend not responding"
  exit 1
fi

if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "❌ Frontend not responding"
  exit 1
fi

echo "✅ Services are healthy"
echo ""

# Run Playwright tests
echo "🎭 Running Playwright E2E tests..."
npx playwright test tests/e2e/validator.spec.ts --reporter=list

if [ $? -eq 0 ]; then
  echo ""
  echo "======================================"
  echo "🎉 E2E VALIDATOR TESTS PASS ✅"
  echo "======================================"
  exit 0
else
  echo ""
  echo "======================================"
  echo "❌ E2E VALIDATOR TESTS FAIL"
  echo "======================================"
  exit 1
fi
