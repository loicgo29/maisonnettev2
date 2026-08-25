#!/bin/bash
set -e

echo "🧪 Running BDD Smoke Tests..."
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found"
  exit 1
fi

# Run the smoke tests
echo "📋 Testing Docker Services, Backend API, and Database..."
npm run test:bdd -- tests/features/smoke-test.feature

echo ""
echo "✅ All BDD smoke tests completed!"
echo ""
echo "Test Results Summary:"
echo "- Docker Services: ✓ All containers running"
echo "- Backend API:     ✓ Health check endpoint responds"
echo "- Database:        ✓ PostgreSQL connection successful"
echo ""
echo "🚀 Ready for deployment!"
