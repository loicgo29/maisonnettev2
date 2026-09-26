#!/bin/bash
# Obtenir un token d'accès Keycloak pour tester les routes protégées
#
# Usage:
#   ./scripts/get-keycloak-token.sh                    # Token pour logo-back
#   ./scripts/get-keycloak-token.sh logo-back password # Token avec identifiants custom
#   ./scripts/get-keycloak-token.sh --base64           # Token en base64 (pour CI)

set -e

# Config
KEYCLOAK_URL="${KEYCLOAK_URL:-https://auth.maisonnette-pecheur-bertheaume.fr}"
REALM="${REALM:-maisonnettev2}"
CLIENT_ID="${OAUTH2_CLIENT_ID:-maisonnettev2-backoffice}"
CLIENT_SECRET="${OAUTH2_CLIENT_SECRET:-}"
USERNAME="${1:-logo-back}"
USER_CRED="${2:-}"
OUTPUT_FORMAT="${3:-}"

# Validation
if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ OAUTH2_CLIENT_SECRET manquant" >&2
    echo "   Charge d'abord : ./scriptslogo/setup/setup-env.sh" >&2
    exit 1
fi

if [ -z "$USER_CRED" ]; then
    echo "❌ Credential manquant pour user '$USERNAME'" >&2
    echo "   Usage: $0 <username> <credential> [--base64]" >&2
    exit 1
fi

# Obtenir le token
echo "🔑 Obtention du token Keycloak pour $USERNAME..." >&2

TOKEN_RESPONSE=$(curl -s -X POST \
    "${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "username=${USERNAME}" \
    -d "password=${USER_CRED}" \
    -d "grant_type=password" \
    -d "scope=openid email profile")

# Parser le token (sans jq)
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Erreur d'authentification" >&2
    echo "$TOKEN_RESPONSE" | grep -o '"error":"[^"]*' >&2
    exit 1
fi

# Output
if [ "$OUTPUT_FORMAT" = "--base64" ]; then
    echo -n "$ACCESS_TOKEN" | base64 -w0
    echo ""
else
    echo "$ACCESS_TOKEN"
fi

echo "✅ Token obtenu ($(echo -n "$ACCESS_TOKEN" | cut -c1-20)...)" >&2
