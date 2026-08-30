#!/bin/bash
#
# Run BDD tests against production environment (Hetzner)
#
# Prerequisites:
#   - SSH key: ~/.ssh/maisonnettev2_hetzner
#   - SSH host: 23.88.35.119
#   - Connectivity: able to SSH into Hetzner server
#
# Usage:
#   ./scripts/test-production.sh
#   SSH_HOST=custom.host SSH_USER=admin ./scripts/test-production.sh (override SSH)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

SSH_HOST="${SSH_HOST:-23.88.35.119}"
SSH_USER="${SSH_USER:-deploy}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/maisonnettev2_hetzner}"

echo "🚀 Running PRODUCTION environment tests..."
echo "   Environment: Hetzner (CPX11)"
echo "   Frontend: https://maisonnette-pecheur-bertheaume.fr"
echo "   Backend: https://maisonnette-pecheur-bertheaume.fr/api"
echo "   Keycloak: https://auth.maisonnette-pecheur-bertheaume.fr"
echo "   SSH: ${SSH_USER}@${SSH_HOST}"
echo ""

# Verify SSH connectivity
echo "🔐 Verifying SSH connectivity..."
if ! ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" 'echo "✓ Connected"' 2>/dev/null; then
  echo "❌ SSH connection failed. Ensure:"
  echo "   1. SSH key exists: $SSH_KEY"
  echo "   2. SSH host is reachable: $SSH_HOST"
  echo "   3. SSH user is correct: $SSH_USER"
  echo ""
  echo "   Override with:"
  echo "   SSH_HOST=your.host SSH_USER=user SSH_KEY=/path/to/key ./scripts/test-production.sh"
  exit 1
fi

# Run tests
export TEST_ENV=production
export SSH_HOST
export SSH_USER
export SSH_KEY

npx cucumber-js tests/features/production-deployment.feature \
  --require tests/steps/production-services.steps.js \
  --require tests/steps/health-check.steps.js \
  --require tests/steps/page-content.steps.js \
  "$@"
