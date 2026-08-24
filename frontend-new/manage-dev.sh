#!/bin/bash

# Script de management autonome pour Vite dev server
# Gère : start, stop, restart, healthcheck sans demander permission

set -e

PROJECT_DIR="/Volumes/logousb/SSD/Projects/maisonnettev2/frontend-new"
PORT=8030
LOG_FILE="/tmp/vite-managed.log"

cd "$PROJECT_DIR"

# Fonction : arrêter Vite
stop_vite() {
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "vite dev" 2>/dev/null || true
    sleep 1
    lsof -i :$PORT 2>/dev/null | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Fonction : nettoyer cache
clean_cache() {
    rm -rf .svelte-kit node_modules/.vite dist 2>/dev/null || true
}

# Fonction : démarrer Vite
start_vite() {
    npm run dev > "$LOG_FILE" 2>&1 &
    sleep 8
    echo "✅ Vite started on port $PORT (PID: $!)"
}

# Fonction : healthcheck
healthcheck() {
    local status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:$PORT/calendar)
    if [ "$status" = "200" ] || [ "$status" = "404" ]; then
        echo "✅ Server responding ($status)"
        return 0
    else
        echo "❌ Server not responding ($status)"
        return 1
    fi
}

# Fonction : restart complet
restart_fresh() {
    echo "🔄 Full restart..."
    stop_vite
    clean_cache
    start_vite

    if healthcheck; then
        echo "✅ Restart successful"
        return 0
    else
        echo "❌ Restart failed - checking logs:"
        tail -20 "$LOG_FILE"
        return 1
    fi
}

# Main
case "${1:-restart}" in
    start)
        start_vite
        ;;
    stop)
        stop_vite
        echo "✅ Vite stopped"
        ;;
    restart)
        restart_fresh
        ;;
    health)
        healthcheck
        ;;
    logs)
        tail -50 "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|health|logs}"
        exit 1
        ;;
esac
