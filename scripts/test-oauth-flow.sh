#!/bin/bash
# Test du flux OAuth2 complet contre Keycloak — sans navigateur.
#
# Rejoue exactement ce que fait le frontend : PKCE, /auth, login, /token.
# Chaque étape affiche le code HTTP et le corps de la réponse, donc quand
# ça casse on voit *quelle* étape casse et *pourquoi* — ce que la boucle
# de redirection dans le navigateur ne montre jamais.

KC="https://auth.maisonnette-pecheur-bertheaume.fr"
REALM="maisonnettev2"
CLIENT="maisonnettev2-frontend"
REDIRECT="https://maisonnette-pecheur-bertheaume.fr/admin/callback"
COOKIES=$(mktemp)

echo "=== 1. PKCE ==="
VERIFIER=$(openssl rand -hex 32)
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d '=\n' | tr '+/' '-_')
echo "verifier: ${VERIFIER:0:20}... challenge: $CHALLENGE"

echo ""
echo "=== 2. GET /auth (page de login) ==="
AUTH_URL="$KC/realms/$REALM/protocol/openid-connect/auth?client_id=$CLIENT&response_type=code&scope=openid&redirect_uri=$REDIRECT&code_challenge=$CHALLENGE&code_challenge_method=S256"
PAGE=$(curl -s -c "$COOKIES" "$AUTH_URL")

# Le formulaire de login porte l'URL d'authentification avec session_code
FORM=$(printf '%s' "$PAGE" | grep -o 'action="[^"]*login-actions/authenticate[^"]*"' | head -1 | sed 's/action="//;s/"$//' | sed 's/&amp;/\&/g')

if [ -z "$FORM" ]; then
  echo "❌ Pas de formulaire de login trouvé."
  echo "   → le client '$CLIENT' est mal configuré (redirect_uri refusé ?)."
  printf '%s' "$PAGE" | grep -io '<p[^>]*>[^<]*</p>' | head -5
  rm -f "$COOKIES"; exit 1
fi
echo "✅ Formulaire de login présent"

echo ""
echo "=== 3. POST credentials ==="
if [ -z "$KC_USER" ] || [ -z "$KC_PASS" ]; then
  echo "⏭️  KC_USER / KC_PASS non fournis — étape sautée."
  echo "   Lancer avec : KC_USER=... KC_PASS=... $0"
  rm -f "$COOKIES"; exit 0
fi

LOCATION=$(curl -s -o /dev/null -w '%{redirect_url}' -b "$COOKIES" -c "$COOKIES" \
  -d "username=$KC_USER" -d "password=$KC_PASS" "$FORM")

CODE=$(printf '%s' "$LOCATION" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')
if [ -z "$CODE" ]; then
  echo "❌ Pas de code reçu. Redirection : $LOCATION"
  rm -f "$COOKIES"; exit 1
fi
echo "✅ Code reçu : ${CODE:0:20}..."

echo ""
echo "=== 4. POST /token (échange du code) ==="
TOKEN_RESP=$(curl -s -X POST "$KC/realms/$REALM/protocol/openid-connect/token" \
  -d grant_type=authorization_code \
  -d "client_id=$CLIENT" \
  -d "code=$CODE" \
  -d "redirect_uri=$REDIRECT" \
  -d "code_verifier=$VERIFIER")

ACCESS=$(printf '%s' "$TOKEN_RESP" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
if [ -z "$ACCESS" ]; then
  echo "❌ Échange refusé : $TOKEN_RESP"
  rm -f "$COOKIES"; exit 1
fi
echo "✅ access_token obtenu (${#ACCESS} caractères)"

echo ""
echo "=== 5. GET /api/admin/dashboard avec le vrai jeton ==="
API="${API_URL:-https://maisonnette-pecheur-bertheaume.fr}/api/admin/dashboard"
STATUS=$(curl -s -o /tmp/api-body -w '%{http_code}' -H "Authorization: Bearer $ACCESS" "$API")
echo "HTTP $STATUS"
if [ "$STATUS" = "200" ]; then
  echo "✅ Flux OAuth2 complet fonctionnel"
else
  echo "❌ Le backend rejette un jeton pourtant valide :"
  cat /tmp/api-body; echo ""
  echo "   → vérifier KEYCLOAK_REALM_URL et le JWKS côté backend."
fi

rm -f "$COOKIES"
