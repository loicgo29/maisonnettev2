#!/bin/bash
# Deploy to Hetzner with OAuth2 credentials added to .env.production
# Usage: ./scripts/deploy-hetzner-with-oauth2.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Preparing Hetzner deployment with OAuth2 credentials..."

# Load OAuth2 credentials from cache
source ./scripts/ensure-oauth2-credentials.sh

if [ -z "$OAUTH2_CLIENT_ID" ]; then
  echo "❌ Failed to load OAuth2 credentials"
  exit 1
fi

echo "✅ OAuth2 credentials loaded"
echo "  - CLIENT_ID: $OAUTH2_CLIENT_ID"
echo "  - COOKIE_SECRET: ${OAUTH2_COOKIE_SECRET:0:20}..."

# Create temporary .env file for deployment
TEMP_ENV=$(mktemp)
trap "rm -f $TEMP_ENV" EXIT

# Add OAuth2 vars to the temporary env
cat >> "$TEMP_ENV" << EOF
OAUTH2_CLIENT_ID=$OAUTH2_CLIENT_ID
OAUTH2_CLIENT_SECRET=$OAUTH2_CLIENT_SECRET
OAUTH2_COOKIE_SECRET=$OAUTH2_COOKIE_SECRET
EOF

echo "✅ Created temporary env file with OAuth2 vars"
echo ""
echo "To complete deployment, SSH to Hetzner and run:"
echo "  cd /app/maisonnettev2"
echo "  cat >> .env.production << 'ENVEOF'"
cat "$TEMP_ENV"
echo "ENVEOF"
echo "  docker-compose -f docker-compose.prod.yml down"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "Or trigger GitHub Actions workflow with:"
echo "  gh workflow run deploy-hetzner.yml"
