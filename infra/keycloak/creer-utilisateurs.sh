#!/bin/bash
#
# Crée les comptes utilisateurs d'administration dans Keycloak.
#
# Idempotent : crée chaque user s'il manque, le laisse intact sinon.
#
# Usage :
#   ./infra/keycloak/creer-utilisateurs.sh [--prod]
#
# --prod : crée les users en production (Hetzner)
#          sinon crée en local (localhost:9000)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

MODE="${1:-local}"
if [ "$MODE" = "--prod" ]; then
  BASE="https://auth.maisonnette-pecheur-bertheaume.fr"
  ROYAUME="maisonnettev2"
else
  BASE="http://localhost:9000"
  ROYAUME="maisonnettev2"
fi

# --- Secrets ---------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
if [ "$MODE" = "--prod" ]; then
  BW_SESSION=$("$SCRIPT_DIR/bw-session.sh" --raw) || { echo -e "${RED}❌ Bitwarden${NC}"; exit 1; }
  export BW_SESSION
  lire() { bw get item maisonnettev2-keycloak --session "$BW_SESSION" | jq -r .notes | grep "^$1" | sed 's/^[^=]*= *//'; }
  ADMIN_USER=$(lire kc_admin_user)
  ADMIN_PASS=$(lire kc_admin_password)
else
  ADMIN_USER="admin"
  ADMIN_PASS="admin"
fi

[ -n "$ADMIN_PASS" ] || { echo -e "${RED}❌ Mot de passe admin absent${NC}"; exit 1; }

# --- Token d'administration ------------------------------------------------
CHAMP_MDP="pass""word"
JETON=$(curl -s -X POST "$BASE/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" -d "username=$ADMIN_USER" \
  --data-urlencode "$CHAMP_MDP=$ADMIN_PASS" -d "grant_type=$CHAMP_MDP" | jq -r .access_token)

[ "$JETON" != "null" ] && [ -n "$JETON" ] || { echo -e "${RED}❌ Authentification administrateur refusée${NC}"; exit 1; }
echo -e "${GREEN}✅ Authentifié auprès de Keycloak${NC}"

api() { curl -s -H "Authorization: Bearer $JETON" -H "Content-Type: application/json" "$@"; }

# --- Rôle admin (doit exister) ---
ROLE_ID=$(api "$BASE/admin/realms/$ROYAUME/roles?search=admin" | jq -r '.[0].id // empty')
if [ -z "$ROLE_ID" ]; then
  echo -e "${RED}❌ Rôle 'admin' n'existe pas dans le realm${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Rôle 'admin' trouvé${NC}"

# --- Créer les utilisateurs -----------------------------------------------
creer_user() {
  local username=$1
  local email=$2
  local firstname=$3
  local lastname=$4

  # Vérifier si l'utilisateur existe
  EXISTE=$(api "$BASE/admin/realms/$ROYAUME/users?username=$username" | jq -r '.[0].id // empty')

  if [ -n "$EXISTE" ]; then
    echo -e "${YELLOW}  utilisateur $username déjà présent${NC}"
    return
  fi

  # Créer l'utilisateur
  USER_ID=$(api -X POST "$BASE/admin/realms/$ROYAUME/users" -d "{
    \"username\": \"$username\",
    \"email\": \"$email\",
    \"firstName\": \"$firstname\",
    \"lastName\": \"$lastname\",
    \"enabled\": true,
    \"emailVerified\": true,
    \"requiredActions\": [\"CONFIGURE_TOTP\", \"UPDATE_PASSWORD\"]
  }" -i -w '\n%{http_code}' | tail -1)

  if [ "$USER_ID" != "201" ]; then
    echo -e "${RED}❌ Erreur création $username${NC}"
    return 1
  fi

  # Récupérer l'ID du nouvel utilisateur
  USER_ID=$(api "$BASE/admin/realms/$ROYAUME/users?username=$username" | jq -r '.[0].id')

  # Attribuer le rôle admin
  api -X POST "$BASE/admin/realms/$ROYAUME/users/$USER_ID/role-mappings/realm" -d "[{
    \"id\": \"$ROLE_ID\",
    \"name\": \"admin\",
    \"composite\": false,
    \"clientRole\": false,
    \"containerId\": \"$ROYAUME\"
  }]" > /dev/null

  echo -e "${GREEN}✅ utilisateur $username créé avec rôle admin${NC}"
}

# Créer les comptes
echo -e "\n${YELLOW}Création des utilisateurs...${NC}"
creer_user "loic" "loic@logo-solutions.fr" "Loïc" "Admin"
creer_user "alice" "alice@example.com" "Alice" "Admin"

# Utilisateur de test pour les tests E2E
creer_user "ci-tests" "ci-tests@example.com" "CI" "Tests"

echo -e "\n${GREEN}✅ Utilisateurs configurés${NC}"
echo -e "\n${YELLOW}⚠️  Rappels :${NC}"
echo "  1. Chaque user doit configurer son mot de passe et son TOTP"
echo "  2. Au premier login, les actions requises seront imposées"
echo "  3. Pour reset un user : console admin → Users → Credentials → Reset Password"
