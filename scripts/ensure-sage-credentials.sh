#!/bin/bash
# Ensure Sage credentials are loaded and exported
# Usage: source ./scripts/ensure-sage-credentials.sh
# Or standalone: ./scripts/ensure-sage-credentials.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
CREDENTIALS_FILE="$PROJECT_ROOT/.env.sage-credentials"

echo "🔐 Ensuring Sage credentials..."

# 1. Check if cached credentials exist
if [ -f "$CREDENTIALS_FILE" ]; then
  echo "✅ Found cached credentials at $CREDENTIALS_FILE"
  # Source them into current shell
  set -a
  source "$CREDENTIALS_FILE"
  set +a
  echo "✅ Sage credentials loaded into environment"
  exit 0
fi

# 2. If not cached, try to fetch from Bitwarden
echo "⚠️  No cached credentials. Attempting to fetch from Bitwarden..."

if command -v bw &> /dev/null; then
  # Check if Bitwarden session exists
  if [ -z "$BW_SESSION" ]; then
    echo "❌ Bitwarden not unlocked. Run: bw unlock"
    exit 1
  fi
  
  echo "🔍 Fetching Sage credentials from Bitwarden..."
  # Fetch from Bitwarden item "maisonnettev2-sage"
  BW_ITEM=$(bw get item maisonnettev2-sage 2>/dev/null || echo "")
  
  if [ -z "$BW_ITEM" ]; then
    echo "❌ Could not find 'maisonnettev2-sage' item in Bitwarden"
    exit 1
  fi
  
  # Extract fields and save to cache
  cat > "$CREDENTIALS_FILE" << 'CREDS'
# Sage Active API Credentials
# Cached from Bitwarden: maisonnettev2-sage
# DO NOT COMMIT - Automatically generated

SAGE_CLIENT_ID=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="client_id") | .value')
SAGE_CLIENT_SECRET=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="client_secret") | .value')
SAGE_SUBSCRIPTION_KEY=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="subscription_key") | .value')
SAGE_SECONDARY_KEY=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="secondary_key") | .value')
SAGE_REDIRECT_URI=https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback
CREDS

  chmod 600 "$CREDENTIALS_FILE"
  echo "✅ Cached credentials from Bitwarden"
  
  # Source them
  set -a
  source "$CREDENTIALS_FILE"
  set +a
  exit 0
else
  echo "❌ Bitwarden CLI not found. Install with: brew install bitwarden-cli"
  exit 1
fi
