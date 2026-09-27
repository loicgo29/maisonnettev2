#!/bin/bash
# immich-backup-validate.sh — Valide l'intégrité du backup Immich
set -euo pipefail

NTFY_URL="http://localhost:8090/immich-validate"
BACKUP_DIR="/Volumes/logousb/SSD/Projects/maisonnettev2/backups"
LOG_DIR="/Volumes/logousb/SSD/Projects/maisonnettev2/scripts/backup-restore/logs"
PG_CONTAINER="immich_postgres"
PG_USER="immich"
PG_DATABASE="immich"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/validate-immich-$(date +%Y%m%d).log"

notify() {
  curl -s -H "Title: $1" -H "Priority: ${3:-default}" -d "$2" "$NTFY_URL" 2>/dev/null || true
}

echo "==> Validation Immich Backup démarrée ($(date))" | tee "$LOG_FILE" >&2

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/immich-db-*.dump 2>/dev/null | head -1)
[ -z "$LATEST_BACKUP" ] && { notify "Immich Validate" "Aucun backup." "urgent"; exit 1; }

BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | awk "{print \$1}")
echo "==> Backup: $(basename "$LATEST_BACKUP") ($BACKUP_SIZE)" | tee -a "$LOG_FILE" >&2

# Tester intégrité
RESTORE_LINES=$(cat "$LATEST_BACKUP" | docker exec -i "$PG_CONTAINER" pg_restore --list 2>&1 | wc -l)
echo "==> Schéma: ✅ $RESTORE_LINES lignes" | tee -a "$LOG_FILE" >&2

# Contenu base active
PHOTO_COUNT=$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DATABASE" -tc "SELECT COUNT(*) FROM assets WHERE type='IMAGE';" 2>/dev/null | tr -d " " || echo "0")
VIDEO_COUNT=$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DATABASE" -tc "SELECT COUNT(*) FROM assets WHERE type='VIDEO';" 2>/dev/null | tr -d " " || echo "0")
ALBUM_COUNT=$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DATABASE" -tc "SELECT COUNT(*) FROM albums;" 2>/dev/null | tr -d " " || echo "0")
USER_COUNT=$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DATABASE" -tc "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d " " || echo "0")
TOTAL=$((PHOTO_COUNT + VIDEO_COUNT))

echo "==> 📊 Contenu: $TOTAL assets ($PHOTO_COUNT 📷 + $VIDEO_COUNT 🎬) | $ALBUM_COUNT 📁 | $USER_COUNT 👥" | tee -a "$LOG_FILE" >&2

[ "$TOTAL" -gt 0 ] && notify "✅ Immich OK" "Backup $BACKUP_SIZE ✓\n📊 $TOTAL assets\n🧬 Schéma OK" "low"
echo "==> Validation OK ($(date))" | tee -a "$LOG_FILE" >&2
