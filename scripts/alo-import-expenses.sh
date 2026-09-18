#!/bin/bash
# Import expenses from CSV to local DB
# Reads .env from local (alo-backend) or parent directory

set -e
cd "$(dirname "$0")/../alo-backend"

# Load DATABASE_URL from local .env first, then parent
if [ -f .env ]; then
  export $(grep '^DATABASE_URL' .env)
else
  export $(grep '^DATABASE_URL' ../.env)
fi

uv run python3 scripts/import-expenses.py
