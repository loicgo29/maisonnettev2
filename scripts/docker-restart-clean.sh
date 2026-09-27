#!/bin/bash
# Script unique pour relancer Docker correctement (sans problèmes de cache)
# À utiliser SYSTÉMATIQUEMENT en cas de problème Docker ou rebuild nécessaire

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "🐳 Docker Restart (Clean Cache Strategy)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Stop tous les containers
echo ""
echo "[1/4] Stopping all containers..."
cd "$PROJECT_ROOT"
docker-compose down 2>/dev/null || true
echo "✅ Containers stopped"

# 2. Nettoyer les images inutilisées (optionnel, mais aide pour USB)
echo ""
echo "[2/4] Cleaning unused images (freeing USB space)..."
docker image prune -af --filter "until=24h" 2>/dev/null || true
echo "✅ Cleanup done"

# 3. Redémarrer les services SANS rebuild (images déjà en cache)
echo ""
echo "[3/4] Starting services (using cached images, no rebuild)..."
docker-compose up -d 2>/dev/null || {
    echo "❌ Failed to start. Checking env..."
    exit 1
}
echo "✅ Services started"

# 4. Vérification santé
echo ""
echo "[4/4] Health check..."
sleep 3
if docker-compose ps | grep -q "healthy\|running"; then
    echo "✅ Services healthy"
else
    echo "⚠️  Services may not be ready. Check logs:"
    echo "   docker-compose logs"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Docker restart complete (no rebuild, just restart)"
echo ""
echo "💡 Tips:"
echo "  - Frontend rebuild: ./scripts/rebuild-frontend.sh"
echo "  - Backend restart: docker-compose restart backend"
echo "  - View logs: docker-compose logs -f"
echo ""
