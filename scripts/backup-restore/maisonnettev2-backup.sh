#!/bin/bash
# maisonnettev2-backup.sh — Backup quotidien de la base maisonnettev2 (PostgreSQL)
# S'exécute localement à 3:00 AM via LaunchAgent
set -euo pipefail

NTFY_URL="http://localhost:8090/maisonnettev2-backup"
PROJECT_ROOT="/Volumes/logousb/SSD/Projects/maisonnettev2"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/scripts/backup-restore/logs"
EXPANSION_BACKUP_DIR="/Volumes/HDD6/01-Froide/sauvegarde-live-logo-projects/MAISONNETTEV2"
PG_CONTAINER="postgres-maisonnettev2"
PG_USER="maisonnettev2"
PG_DATABASE="maisonnettev2"
mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$EXPANSION_BACKUP_DIR"

LOG_FILE="$LOG_DIR/backup-maisonnettev2-$(date +%Y%m%d).log"
START_TIME=$(date +%s)

notify() {
  local title="$1" msg="$2" priority="${3:-default}"
  curl -s -H "Title: $title" -H "Priority: $priority" -d "$msg" "$NTFY_URL" 2>/dev/null || true
}

duration_human() {
  local seconds=$1
  local hours=$((seconds / 3600))
  local minutes=$(((seconds % 3600) / 60))
  printf "%dh%02dm" "$hours" "$minutes"
}

echo "==> Sauvegarde Maisonnettev2 (PostgreSQL) démarrée ($(date))" | tee "$LOG_FILE" >&2

# Vérifier que le container Postgres tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  notify "Maisonnettev2 Backup échoué" "Container $PG_CONTAINER non démarré." "urgent"
  echo "==> ERREUR: container $PG_CONTAINER non démarré" | tee -a "$LOG_FILE" >&2
  exit 1
fi

# Dump de la base entière (format custom pg_dump, compressé nativement)
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/maisonnettev2-db-$BACKUP_TIMESTAMP.dump"

echo "==> Dump base $PG_DATABASE (pg_dump) → $BACKUP_FILE..." | tee -a "$LOG_FILE" >&2
if ! docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DATABASE" -Fc > "$BACKUP_FILE" 2>>"$LOG_FILE"; then
  notify "Maisonnettev2 Dump échoué" "Impossible de dumper la base $PG_DATABASE." "urgent"
  echo "==> ERREUR: Dump échoué" | tee -a "$LOG_FILE" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
echo "==> ✓ Dump créé: $SIZE" | tee -a "$LOG_FILE" >&2

# Vérifier intégrité du dump
echo "==> Vérification intégrité du dump..." | tee -a "$LOG_FILE" >&2
if ! docker exec -i "$PG_CONTAINER" pg_restore --list < "$BACKUP_FILE" > /dev/null 2>>"$LOG_FILE"; then
  notify "Maisonnettev2 Dump corrompu" "Le dump créé n'est pas valide." "urgent"
  rm "$BACKUP_FILE"
  exit 1
fi
echo "==> ✓ Intégrité OK" | tee -a "$LOG_FILE" >&2

# Copie Expansion12 (live backup)
echo "==> Copie vers Expansion12..." | tee -a "$LOG_FILE" >&2
if cp "$BACKUP_FILE" "$EXPANSION_BACKUP_DIR/" 2>&1 | tee -a "$LOG_FILE"; then
  echo "==> ✓ Sauvegarde Expansion12 OK" | tee -a "$LOG_FILE" >&2
else
  echo "==> WARN: Copie Expansion12 échouée" | tee -a "$LOG_FILE" >&2
fi

# Rétention locale: garder 7 jours
echo "==> Nettoyage des anciens dumps (> 7 jours)..." | tee -a "$LOG_FILE" >&2
find "$BACKUP_DIR" -name "maisonnettev2-db-*.dump" -mtime +7 -delete 2>/dev/null || true
echo "==> ✓ Nettoyage OK" | tee -a "$LOG_FILE" >&2

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_STR=$(duration_human "$DURATION")

echo "==> Sauvegarde terminée en $DURATION_STR ($(date))" | tee -a "$LOG_FILE" >&2
notify "Maisonnettev2 Sauvegarde OK" "Terminée en $DURATION_STR ($SIZE)." "low"
