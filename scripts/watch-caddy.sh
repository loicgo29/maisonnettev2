#!/bin/bash
# Surveille les changements du Caddyfile et reconstruit automatiquement
# Usage: ./scripts/watch-caddy.sh

CADDYFILE="./caddy/Caddyfile"
LAST_HASH=""

echo "🔍 Surveillance du Caddyfile..."
echo "Le service Caddy sera reconstruit automatiquement en cas de modification"
echo ""

while true; do
  if [ -f "$CADDYFILE" ]; then
    CURRENT_HASH=$(md5sum "$CADDYFILE" | awk '{print $1}')

    if [ -z "$LAST_HASH" ]; then
      LAST_HASH="$CURRENT_HASH"
    elif [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
      echo "📝 Changement détecté dans Caddyfile!"
      echo "🔄 Reconstruction de Caddy..."
      docker-compose down caddy 2>/dev/null
      sleep 2
      docker-compose up -d --build caddy
      echo "✅ Caddy a été reconstruit"
      LAST_HASH="$CURRENT_HASH"
    fi
  fi

  sleep 5
done
