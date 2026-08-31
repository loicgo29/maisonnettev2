#!/bin/bash
# Deploy rebuild script — MUST be used to rebuild with environment variables
# NEVER use: docker compose build (missing env-file)
# ALWAYS use: docker compose --env-file .env build

set -euo pipefail

echo "🚀 === SAFE REBUILD (avec --env-file) ==="
echo ""

# Verify .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env not found"
  echo "   Run: ./setup-env.sh or transfer .env from production"
  exit 1
fi

echo "✓ .env found"

# Verify critical env vars
for var in PRIVATE_GOOGLE_CLIENT_ID PRIVATE_GOOGLE_REDIRECT_URI; do
  if ! grep -q "^${var}=" .env; then
    echo "❌ Missing in .env: ${var}"
    exit 1
  fi
done
echo "✓ All critical env vars present"

echo ""
echo "🔨 Rebuilding frontend with --env-file (MUST HAVE env-file)..."
# THIS IS THE CRITICAL COMMAND:
# --env-file MUST come BEFORE -f docker-compose.prod.yml
docker compose \
  --env-file .env \
  -f docker-compose.prod.yml \
  build --no-cache frontend

echo ""
echo "✅ Frontend rebuilt with environment variables"
echo "   Use: docker compose -f docker-compose.prod.yml up -d"
