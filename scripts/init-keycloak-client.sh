#!/bin/bash

# Initialize Keycloak client for maisonnettev2
# Run this AFTER Keycloak is up but BEFORE deploying the app

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:9000}"
REALM="maisonnettev2"
CLIENT_ID="maisonnettev2-frontend"
ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:?Error: KEYCLOAK_ADMIN_PASSWORD env var required}"
REDIRECT_URI="${REDIRECT_URI:-https://maisonnette-pecheur-bertheaume.fr/admin/callback}"

echo "🔐 Initializing Keycloak client: $CLIENT_ID"
echo "   Realm: $REALM"
echo "   Redirect URI: $REDIRECT_URI"

# Login to Keycloak
echo "📝 Logging in to Keycloak..."
TOKEN=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-cli" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to authenticate with Keycloak"
  exit 1
fi

echo "✅ Authenticated"

# Create client
echo "🔧 Creating OAuth2 client..."
RESPONSE=$(curl -s -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'$CLIENT_ID'",
    "name": "Maisonnettev2 Frontend",
    "description": "Frontend application for maisonnettev2",
    "public": true,
    "redirectUris": ["'$REDIRECT_URI'"],
    "webOrigins": ["https://maisonnette-pecheur-bertheaume.fr"],
    "protocol": "openid-connect",
    "enabled": true,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": false,
    "serviceAccountsEnabled": false,
    "authorizationServicesEnabled": false
  }')

if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  CLIENT_UUID=$(echo "$RESPONSE" | jq -r '.id')
  echo "✅ Client created: $CLIENT_UUID"
else
  # Client might already exist
  echo "⚠️  Client may already exist or error occurred"
  echo "$RESPONSE" | jq '.'
fi

echo "🎉 Keycloak initialization complete!"
