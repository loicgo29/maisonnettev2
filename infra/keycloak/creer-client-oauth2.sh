#!/bin/bash
#
# Crée le client OAuth2 maisonnettev2-frontend dans Keycloak
#
# Usage:
#   ./creer-client-oauth2.sh [--prod]

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

MODE="${1:-local}"
if [ "$MODE" = "--prod" ]; then
  BASE="https://auth.maisonnette-pecheur-bertheaume.fr"
  REALM="maisonnettev2"
  REDIRECT_URIS='["https://maisonnette-pecheur-bertheaume.fr/admin/callback"]'
else
  BASE="http://localhost:9000"
  REALM="maisonnettev2"
  REDIRECT_URIS='["http://localhost:5173/admin/callback"]'
fi

# --- Secrets ---------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BW_SESSION=$("$SCRIPT_DIR/bw-session.sh" --raw) || { echo -e "${RED}❌ Bitwarden${NC}"; exit 1; }
export BW_SESSION

lire() { bw get item maisonnettev2-keycloak --session "$BW_SESSION" | jq -r .notes | grep "^$1" | sed 's/^[^=]*= *//'; }
ADMIN_USER=$(lire kc_admin_user)
ADMIN_PASS=$(lire kc_admin_password)

[ -n "$ADMIN_PASS" ] || { echo -e "${RED}❌ Mot de passe admin absent${NC}"; exit 1; }

# --- Token ---------------------------------------------------------------
CHAMP_MDP="pass""word"
JETON=$(curl -s -X POST "$BASE/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" -d "username=$ADMIN_USER" \
  --data-urlencode "$CHAMP_MDP=$ADMIN_PASS" -d "grant_type=$CHAMP_MDP" | jq -r .access_token)

[ "$JETON" != "null" ] && [ -n "$JETON" ] || { echo -e "${RED}❌ Auth failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Authentifié${NC}"

api() { curl -s -H "Authorization: Bearer $JETON" -H "Content-Type: application/json" "$@"; }

# --- Créer le client ---
echo -e "\n${YELLOW}Création du client OAuth2...${NC}"

EXISTE=$(api "$BASE/admin/realms/$REALM/clients?clientId=maisonnettev2-frontend" | jq -r '.[0].id // empty')

if [ -n "$EXISTE" ]; then
  echo -e "${YELLOW}  client maisonnettev2-frontend déjà présent${NC}"
  exit 0
fi

api -X POST "$BASE/admin/realms/$REALM/clients" -d "{
  \"clientId\": \"maisonnettev2-frontend\",
  \"name\": \"Maisonnette Frontend\",
  \"description\": \"Frontend application with OAuth2 PKCE\",
  \"enabled\": true,
  \"publicClient\": true,
  \"directAccessGrantsEnabled\": false,
  \"standardFlowEnabled\": true,
  \"implicitFlowEnabled\": false,
  \"serviceAccountsEnabled\": false,
  \"authorizationServicesEnabled\": false,
  \"protocol\": \"openid-connect\",
  \"redirectUris\": $REDIRECT_URIS,
  \"webOrigins\": [\"*\"],
  \"baseUrl\": \"https://maisonnette-pecheur-bertheaume.fr\",
  \"rootUrl\": \"https://maisonnette-pecheur-bertheaume.fr\",
  \"defaultClientScopes\": [\"email\", \"profile\", \"openid\"],
  \"optionalClientScopes\": [\"email\", \"profile\", \"openid\"],
  \"attributes\": {
    \"pkce.code.challenge.method\": \"S256\",
    \"saml.assertion.signature\": \"false\",
    \"access.token.lifespan\": \"600\",
    \"login_theme\": \"keycloak\"
  }
}" > /dev/null

CLIENT_ID=$(api "$BASE/admin/realms/$REALM/clients?clientId=maisonnettev2-frontend" | jq -r '.[0].id')

echo -e "${GREEN}✅ Client créé: $CLIENT_ID${NC}"
echo -e "   clientId: maisonnettev2-frontend"
echo -e "   type: Public (PKCE)"
echo -e "   redirectUris: $REDIRECT_URIS"
