#!/bin/bash
# Vérifie que l'URL JWKS construite par le backend est bien celle que
# Keycloak publie, et qu'elle répond 200.
#
# Une URL JWKS fausse ne casse rien au démarrage : le backend se lance,
# répond /health, et rejette ensuite *tous* les jetons en 401 — y compris
# les valides. Ce test transforme cette panne silencieuse en échec net.

set -u

REALM_URL=$(docker exec maisonnette-test-backend sh -c 'echo $KEYCLOAK_REALM_URL' 2>/dev/null)

if [ -z "$REALM_URL" ]; then
  echo "❌ KEYCLOAK_REALM_URL absent du conteneur backend"
  exit 1
fi
echo "KEYCLOAK_REALM_URL = $REALM_URL"

# Doit rester identique au calcul dans backend/src/middleware/oidc.ts
BACKEND_JWKS="${REALM_URL}protocol/openid-connect/certs"
DECLARED=$(curl -s "${REALM_URL}.well-known/openid-configuration" \
  | sed -n 's/.*"jwks_uri":"\([^"]*\)".*/\1/p')

echo "URL utilisée par le backend : $BACKEND_JWKS"
echo "URL publiée par Keycloak    : $DECLARED"

FAIL=0

if [ "$BACKEND_JWKS" != "$DECLARED" ]; then
  echo "❌ Les deux URLs divergent → tout jeton sera rejeté en 401"
  FAIL=1
else
  echo "✅ URLs identiques"
fi

STATUS=$(curl -s -o /tmp/jwks-body -w '%{http_code}' "$BACKEND_JWKS")
if [ "$STATUS" != "200" ]; then
  echo "❌ JWKS renvoie HTTP $STATUS (attendu 200)"
  FAIL=1
elif ! grep -q '"keys"' /tmp/jwks-body; then
  echo "❌ JWKS répond 200 mais ne contient pas de clés"
  FAIL=1
else
  echo "✅ JWKS accessible et contient des clés"
fi

rm -f /tmp/jwks-body
exit $FAIL
