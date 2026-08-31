#!/bin/sh
# Entrypoint: Ensure .env exists at runtime for SvelteKit $env/static/private

if [ ! -f "/app/.env" ] && [ -f "/run/.env" ]; then
  echo "Copying .env from runtime..."
  cp /run/.env /app/.env
fi

exec "$@"
