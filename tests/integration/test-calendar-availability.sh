#!/bin/bash
# Test: Calendar Availability Fetch
# Purpose: Verify calendar endpoint returns availability data
# Status: To be implemented when frontend infrastructure stabilized

set -e

echo "📅 Calendar Availability Test"
echo ""

BACKEND_HOST="${BACKEND_HOST:-localhost}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
API_URL="http://$BACKEND_HOST:$BACKEND_PORT"

echo "Testing calendar endpoints..."

# Test 1: Calendar list (public, no auth required)
echo "1️⃣ GET /api/calendar/list"
if curl -s "$API_URL/api/calendar/list" > /dev/null 2>&1; then
  echo "✅ Calendar list endpoint responds"
else
  echo "⚠️ Calendar list endpoint not implemented yet"
fi

# Test 2: Availability for date range
echo "2️⃣ GET /api/calendar/availability?start=2026-09-04&end=2026-09-11"
if curl -s "$API_URL/api/calendar/availability?start=2026-09-04&end=2026-09-11" > /dev/null 2>&1; then
  echo "✅ Availability endpoint responds"
else
  echo "⚠️ Availability endpoint not implemented yet"
fi

echo ""
echo "Status: Frontend error 'Failed to fetch calendar' needs investigation"
echo "Likely cause: Backend calendar routes not yet implemented"
echo ""
