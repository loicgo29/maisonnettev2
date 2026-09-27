#!/bin/bash
# Add OAuth2 variables to Hetzner .env.production and restart deployment
# Usage: ./scripts/deploy-oauth2-vars.sh <DEPLOY_USER> <DEPLOY_HOST> <DEPLOY_KEY_FILE>

set -e

DEPLOY_USER="${1:-deploy}"
DEPLOY_HOST="${2}"
DEPLOY_KEY_FILE="${3}"

if [ -z "$DEPLOY_HOST" ]; then
  echo "Usage: $0 <DEPLOY_USER> <DEPLOY_HOST> <DEPLOY_KEY_FILE>"
  echo "Example: $0 deploy server.hetzner.com ~/.ssh/hetzner_key"
  exit 1
fi

if [ ! -f "$DEPLOY_KEY_FILE" ]; then
  echo "❌ Deploy key not found: $DEPLOY_KEY_FILE"
  exit 1
fi

echo "🚀 Deploying OAuth2 variables to Hetzner..."
echo "  Host: $DEPLOY_HOST"
echo "  User: $DEPLOY_USER"

# Add OAuth2 vars to .env.production
ssh -i "$DEPLOY_KEY_FILE" "$DEPLOY_USER@$DEPLOY_HOST" << 'SSHEOF'
cd /app/maisonnettev2

# Check if OAuth2 vars already exist
if grep -q "OAUTH2_CLIENT_ID" .env.production; then
  echo "⚠️ OAuth2 variables already in .env.production"
else
  echo "📝 Adding OAuth2 variables to .env.production..."
  cat >> .env.production << 'ENVEOF'

# OAuth2 / Keycloak credentials (added 2026-09-26)
OAUTH2_CLIENT_ID=maisonnettev2-backoffice
OAUTH2_CLIENT_SECRET=5qd1H9X2N9REHtLTSS7K6DYjPqP7scaM
OAUTH2_COOKIE_SECRET=ORxvMhpve76DwyGcMNdv1P5CsN1Gua7qpihFgQDeAgk=
ENVEOF
  echo "✅ OAuth2 variables added"
fi

echo "🔄 Restarting deployment..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Waiting for services to be healthy..."
sleep 10

# Check if services are running
docker ps | grep -E "maisonnette-(backend|frontend|postgres|caddy|oauth2-proxy)" || echo "⚠️ Some services may not have started"

echo "✅ Deployment complete"
SSHEOF

echo "✅ OAuth2 deployment successful"
