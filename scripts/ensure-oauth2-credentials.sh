#!/bin/bash
# Ensure OAuth2 credentials are loaded for maisonnettev2-backoffice
# Strategy: Local cache → Bitwarden fallback

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
CACHE_FILE="$PROJECT_ROOT/.env.oauth2-credentials"

echo "🔐 Ensuring OAuth2 credentials..."

# Check if cached credentials exist
if [ -f "$CACHE_FILE" ]; then
  echo "✅ Found cached credentials at $CACHE_FILE"
  source "$CACHE_FILE"
  echo "✅ OAuth2 credentials loaded into environment"
  exit 0
fi

# Fallback: Fetch from Bitwarden (requires `bw` CLI and `bw unlock` in session)
echo "⚠️ No cached credentials found, attempting Bitwarden..."

if ! command -v bw &> /dev/null; then
  echo "❌ bw CLI not found. Install with: brew install bitwarden-cli"
  exit 1
fi

# Check if Bitwarden is unlocked
if [ -z "$BW_SESSION" ]; then
  echo "❌ Bitwarden not unlocked. Run: bw unlock"
  exit 1
fi

# Fetch from Bitwarden item "maisonnettev2-oauth2"
echo "Fetching from Bitwarden item 'maisonnettev2-oauth2'..."
BW_ITEM=$(bw get item "maisonnettev2-oauth2" 2>/dev/null || echo "")

if [ -z "$BW_ITEM" ]; then
  echo "❌ Could not fetch from Bitwarden. Ensure item 'maisonnettev2-oauth2' exists."
  exit 1
fi

# Extract fields using jq
OAUTH2_CLIENT_ID=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="client_id") | .value')
OAUTH2_CLIENT_SECRET=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="client_secret") | .value')
OAUTH2_COOKIE_SECRET=$(echo "$BW_ITEM" | jq -r '.fields[] | select(.name=="cookie_secret") | .value')

if [ -z "$OAUTH2_CLIENT_ID" ] || [ -z "$OAUTH2_CLIENT_SECRET" ]; then
  echo "❌ Missing fields in Bitwarden item"
  exit 1
fi

# Cache locally for future use
cat > "$CACHE_FILE" << EOF
# OAuth2 credentials cached from Bitwarden on $(date)
OAUTH2_CLIENT_ID=$OAUTH2_CLIENT_ID
OAUTH2_CLIENT_SECRET=$OAUTH2_CLIENT_SECRET
OAUTH2_COOKIE_SECRET=$OAUTH2_COOKIE_SECRET
EOF

chmod 600 "$CACHE_FILE"

# Export to environment
export OAUTH2_CLIENT_ID
export OAUTH2_CLIENT_SECRET
export OAUTH2_COOKIE_SECRET

echo "✅ OAuth2 credentials fetched from Bitwarden and cached"
echo "✅ OAuth2 credentials loaded into environment"
