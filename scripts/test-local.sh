#!/bin/bash
#
# Run BDD tests against local development environment (Mac Mini)
#
# Usage:
#   ./scripts/test-local.sh
#   ./scripts/test-local.sh --watch   (re-run on file changes)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "🧪 Running LOCAL environment tests..."
echo "   Environment: Mac Mini (localhost)"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:3001"
echo "   Keycloak: http://localhost:9000"
echo ""

# Ensure containers are running
echo "📦 Checking Docker containers..."
if ! docker ps --format "table {{.Names}}" | grep -q maisonnette-test-frontend; then
  echo "❌ Local containers not running. Start them with:"
  echo "   docker-compose -f docker-compose.test.yml up -d"
  exit 1
fi

# Run tests
export TEST_ENV=local
npx cucumber-js tests/features/local-services.feature \
  --require tests/steps/local-services.steps.js \
  --require tests/steps/health-check.steps.js \
  --require tests/steps/page-content.steps.js \
  "$@"
