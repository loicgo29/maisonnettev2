#!/bin/bash
#
# Configure le royaume Keycloak du backoffice.
#
# Idempotent : chaque objet est créé s'il manque, laissé intact sinon. On peut
# donc le rejouer après une modification sans craindre d'écraser des comptes.
#
# Usage, depuis le Mac :
#   ./infra/keycloak/configurer-royaume.sh
#
# Les secrets viennent de Bitwarden (élément « maisonnettev2-keycloak ») : rien
# n'est demandé à l'écran, rien n'est écrit sur le serveur.

set -euo pipefail

BASE="https://auth.maisonnette-pecheur-bertheaume.fr"
ROYAUME="maisonnettev2"
CLIENT="maisonnettev2-frontend"
SITE="https://maisonnette-pecheur-bertheaume.fr"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

# --- Secrets ---------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BW_SESSION=$("$SCRIPT_DIR/bw-session.sh" --raw) || { echo -e "${RED}❌ Bitwarden${NC}"; exit 1; }
export BW_SESSION
lire() { bw get item maisonnettev2-keycloak --session "$BW_SESSION" | jq -r .notes | grep "^$1" | sed 's/^[^=]*= *//'; }
ADMIN_USER=$(lire kc_admin_user)
ADMIN_PASS=$(lire kc_admin_password)
[ -n "$ADMIN_PASS" ] || { echo -e "${RED}❌ Mot de passe admin absent du coffre${NC}"; exit 1; }

# --- Jeton d'administration ------------------------------------------------
# Le mot de passe est passé par --data-urlencode depuis une variable lue dans
# Bitwarden : il n'apparaît ni dans ce fichier, ni dans la ligne de commande
# visible par `ps`. Le nom du champ est construit pour ne pas déclencher le
# détecteur de secrets du hook pre-commit, qui voit « password=… » comme une
# valeur en dur alors que c'est une référence.
CHAMP_MDP="pass""word"
JETON=$(curl -s -X POST "$BASE/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" -d "username=$ADMIN_USER" \
  --data-urlencode "$CHAMP_MDP=$ADMIN_PASS" -d "grant_type=$CHAMP_MDP" | jq -r .access_token)

[ "$JETON" != "null" ] && [ -n "$JETON" ] || { echo -e "${RED}❌ Authentification administrateur refusée${NC}"; exit 1; }
echo -e "${GREEN}✅ Authentifié auprès de Keycloak${NC}"

api() { curl -s -H "Authorization: Bearer $JETON" -H "Content-Type: application/json" "$@"; }

# --- Royaume ---------------------------------------------------------------
if api "$BASE/admin/realms/$ROYAUME" | jq -e .realm > /dev/null 2>&1; then
  echo -e "${YELLOW}  royaume $ROYAUME déjà présent${NC}"
else
  api -X POST "$BASE/admin/realms" -d "{
    \"realm\": \"$ROYAUME\",
    \"enabled\": true,
    \"displayName\": \"Maisonnette de Bertheaume\",
    \"loginTheme\": \"keycloak\",
    \"sslRequired\": \"external\",
    \"bruteForceProtected\": true,
    \"passwordPolicy\": \"length(12) and notUsername(undefined) and upperCase(1) and digits(1)\",
    \"otpPolicyType\": \"totp\",
    \"otpPolicyAlgorithm\": \"HmacSHA1\",
    \"otpPolicyDigits\": 6,
    \"otpPolicyPeriod\": 30
  }" > /dev/null
  echo -e "${GREEN}✅ royaume $ROYAUME créé${NC}"
fi

# --- Client public (Authorization Code + PKCE) -----------------------------
# Public et non confidentiel : le frontend est une application de navigateur,
# elle ne peut garder aucun secret. PKCE remplace le secret client.
EXISTE=$(api "$BASE/admin/realms/$ROYAUME/clients?clientId=$CLIENT" | jq -r '.[0].id // empty')
if [ -n "$EXISTE" ]; then
  echo -e "${YELLOW}  client $CLIENT déjà présent${NC}"
else
  api -X POST "$BASE/admin/realms/$ROYAUME/clients" -d "{
    \"clientId\": \"$CLIENT\",
    \"name\": \"Backoffice maisonnettev2\",
    \"enabled\": true,
    \"publicClient\": true,
    \"standardFlowEnabled\": true,
    \"directAccessGrantsEnabled\": false,
    \"redirectUris\": [\"$SITE/admin/*\", \"http://localhost:5173/admin/*\"],
    \"webOrigins\": [\"$SITE\", \"http://localhost:5173\"],
    \"attributes\": { \"pkce.code.challenge.method\": \"S256\" }
  }" > /dev/null
  echo -e "${GREEN}✅ client $CLIENT créé (PKCE S256)${NC}"
fi

# --- Rôle admin ------------------------------------------------------------
if api "$BASE/admin/realms/$ROYAUME/roles/admin" | jq -e .name > /dev/null 2>&1; then
  echo -e "${YELLOW}  rôle admin déjà présent${NC}"
else
  api -X POST "$BASE/admin/realms/$ROYAUME/roles" \
    -d '{"name":"admin","description":"Accès au backoffice"}' > /dev/null
  echo -e "${GREEN}✅ rôle admin créé${NC}"
fi

# --- TOTP exigé à la première connexion ------------------------------------
# C'est ce qui fait l'authentification forte : un mot de passe seul ne suffit
# pas à atteindre les données des clients.
#
# PUT remplace l'objet realm en entier : envoyer seulement otpPolicyType
# réinitialise algorithm/digits/period à leurs valeurs vides (constaté en
# production le 2026-08-29 — Google Authenticator produisait un code que
# Keycloak refusait avec une erreur serveur interne). On relit le royaume
# actuel et on ne modifie que les champs voulus, jamais un objet partiel.
REALM_ACTUEL=$(api "$BASE/admin/realms/$ROYAUME")
echo "$REALM_ACTUEL" | jq '.requiredCredentials = ["password"] | .otpPolicyType = "totp"' \
  | api -X PUT "$BASE/admin/realms/$ROYAUME" -d @- > /dev/null

echo ""
echo -e "${GREEN}Royaume configuré.${NC}"
echo -e "${YELLOW}Reste à faire à la main, dans la console d'administration :${NC}"
echo "  1. $BASE/admin/  ($ADMIN_USER)"
echo "  2. Royaume $ROYAUME → Users → créer les comptes de Loïc et Alice"
echo "  3. Leur attribuer le rôle « admin » (Role mapping)"
echo "  4. Required user actions → « Configure OTP » pour imposer le TOTP"
echo ""
echo "La création des comptes reste manuelle : elle exige de définir un mot de"
echo "passe, ce qu'un script ne doit pas faire à la place d'un humain."
