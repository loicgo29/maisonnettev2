#!/bin/bash
# Deploy the correct Caddyfile version based on environment
# Usage:
#   ./scripts/deploy-caddyfile.sh         # Deploy to current env (auto-detect)
#   ./scripts/deploy-caddyfile.sh hetzner # Deploy Caddyfile.hetzner to Hetzner
#   ./scripts/deploy-caddyfile.sh local    # Deploy Caddyfile to Mac mini (dev)

set -e

ENV="${1:-auto}"
CADDY_DIR="$(dirname "$0")/../caddy"

# Auto-detect environment from hostname or ask user
if [ "$ENV" = "auto" ]; then
    if command -v hostname &> /dev/null && [ "$(hostname)" = "hetzner" ]; then
        ENV="hetzner"
    else
        echo "Select deployment environment:"
        echo "  1) Hetzner (prod)"
        echo "  2) Mac mini (local dev)"
        read -p "Choice [1-2]: " choice
        case "$choice" in
            1) ENV="hetzner" ;;
            2) ENV="local" ;;
            *) echo "Invalid choice"; exit 1 ;;
        esac
    fi
fi

case "$ENV" in
    hetzner|prod)
        SOURCE="$CADDY_DIR/Caddyfile.hetzner"
        TARGET_HOST="hetzner"
        TARGET_PATH="/opt/maisonnettev2/Caddyfile"
        echo "📦 Deploying Caddyfile.hetzner to $TARGET_HOST..."
        scp "$SOURCE" "$TARGET_HOST:$TARGET_PATH"
        echo "🔄 Restarting Caddy on $TARGET_HOST..."
        ssh "$TARGET_HOST" "docker restart maisonnette-caddy && sleep 3 && docker ps | grep caddy"
        echo "✅ Caddyfile deployed to Hetzner production"
        ;;
    local|dev|mac)
        SOURCE="$CADDY_DIR/Caddyfile"
        TARGET_PATH="/Volumes/logousb/SSD/Projects/maisonnettev2/caddy/Caddyfile"
        echo "📦 Using local Caddyfile ($SOURCE)..."
        if docker-compose ps caddy &>/dev/null; then
            echo "🔄 Restarting Caddy locally..."
            docker-compose restart caddy
            sleep 3
            docker-compose ps caddy
            echo "✅ Caddyfile deployed locally"
        else
            echo "⚠️  Docker Compose not running. Start with: docker-compose up -d"
        fi
        ;;
    *)
        echo "Unknown environment: $ENV"
        echo "Usage: $0 [hetzner|local|auto]"
        exit 1
        ;;
esac
