#!/bin/bash
# Script de reconstruction du frontend maisonnettev2
# Stratégie : npm build sur l'hôte + docker cp (3 min total)
# JAMAIS docker-compose up -d --build (30+ min sur disque USB)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "🔨 Frontend rebuild script (maisonnettev2)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 0. Assurer que PUBLIC_AUTH_BYPASS est dans le .env
echo ""
echo "⚙️  [0/3] Ensuring PUBLIC_AUTH_BYPASS=true in .env..."
cd "$FRONTEND_DIR"
if grep -q "^PUBLIC_AUTH_BYPASS=" .env 2>/dev/null; then
    sed -i '' 's/^PUBLIC_AUTH_BYPASS=.*/PUBLIC_AUTH_BYPASS=true/' .env
else
    echo "PUBLIC_AUTH_BYPASS=true" >> .env
fi
echo "✅ .env updated"

# 1. Build SvelteKit sur l'hôte
echo ""
echo "📦 [1/3] Building frontend on host..."
cd "$FRONTEND_DIR"
npm run build > /tmp/frontend-build.log 2>&1 || {
    echo "❌ Build failed. See /tmp/frontend-build.log"
    tail -50 /tmp/frontend-build.log
    exit 1
}
echo "✅ Frontend built successfully"

# 2. Copier build/ dans le conteneur
echo ""
echo "📮 [2/3] Copying build/ to container..."
docker cp build maisonnettev2-frontend:/app/ || {
    echo "❌ Docker cp failed. Is the container running?"
    exit 1
}
echo "✅ Build copied to container"

# 3. Redémarrer le conteneur
echo ""
echo "🔄 [3/3] Restarting frontend..."
cd "$PROJECT_ROOT"
docker-compose restart frontend > /tmp/restart.log 2>&1 || {
    echo "❌ Restart failed."
    exit 1
}
sleep 2
echo "✅ Frontend restarted"

# Vérification finale
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker-compose exec -T frontend curl -s http://127.0.0.1:5173/ > /dev/null 2>&1; then
    echo "✅ Frontend is healthy at http://localhost:5173"
    echo "   Test at: http://localhost:8030/admin/reservations/nouvelle"
else
    echo "⚠️  Frontend may not be ready yet. Check logs:"
    echo "    docker-compose logs frontend"
fi

echo ""
echo "⏱️  Total time: ~3 minutes (vs 30+ min with docker-compose up -d --build)"
echo "✨ Done!"
