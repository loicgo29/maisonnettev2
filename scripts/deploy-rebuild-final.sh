#!/bin/bash
# ULTIMATE DEPLOYMENT REBUILD - Passes all secrets correctly to Docker build
# This script MUST be used for production deployments

set -euo pipefail

echo "🚀 === ULTIMATE SAFE REBUILD ==="
echo ""

# STEP 1: Verify .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env not found in $(pwd)"
  exit 1
fi

echo "✓ .env found"

# STEP 2: Load variables from .env (with quotes for special chars)
export $(grep -E 'PRIVATE_GOOGLE|PUBLIC_AUTH|PRIVATE_GITE|DB_|KC_' .env | xargs -0)

# STEP 3: Verify critical vars
echo "✓ Checking critical variables..."
: ${PRIVATE_GOOGLE_CLIENT_ID:?PRIVATE_GOOGLE_CLIENT_ID not set}
: ${PRIVATE_GOOGLE_REDIRECT_URI:?PRIVATE_GOOGLE_REDIRECT_URI not set}
: ${PRIVATE_GOOGLE_CLIENT_SECRET:?PRIVATE_GOOGLE_CLIENT_SECRET not set}

# STEP 4: Remove old image
docker rmi -f maisonnettev2-frontend:latest 2>/dev/null || true

# STEP 5: CRITICAL - Pass ALL env vars EXPLICITLY as --build-arg
# This ensures variables are available at Docker build time
echo "🔨 Building frontend with explicit build args..."
docker build \
  --no-cache \
  --build-arg PRIVATE_GOOGLE_CLIENT_ID="${PRIVATE_GOOGLE_CLIENT_ID}" \
  --build-arg PRIVATE_GOOGLE_CLIENT_SECRET="${PRIVATE_GOOGLE_CLIENT_SECRET}" \
  --build-arg PRIVATE_GOOGLE_REDIRECT_URI="${PRIVATE_GOOGLE_REDIRECT_URI}" \
  --build-arg PRIVATE_GITE_CALENDAR_ID="${PRIVATE_GITE_CALENDAR_ID}" \
  --build-arg PUBLIC_AUTH_URL="${PUBLIC_AUTH_URL}" \
  --build-arg PUBLIC_AUTH_REALM="${PUBLIC_AUTH_REALM}" \
  --build-arg PUBLIC_AUTH_CLIENT_ID="${PUBLIC_AUTH_CLIENT_ID}" \
  -t maisonnettev2-frontend:latest \
  ./frontend

echo "✅ Frontend built successfully"
echo ""
echo "💥 Start containers:"
echo "   docker compose -f docker-compose.prod.yml up -d"
