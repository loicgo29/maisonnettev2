#!/bin/bash
# alo-backup.sh — Backup quotidien du schéma alo (PostgreSQL)
# Migré depuis le repo alo standalone (SQLite) le 2026-09-08 :
# alo utilise désormais le PostgreSQL partagé (container postgres-shared,
# base "logo", schéma "alo"), plus SQLite. Voir maisonnettev2/alo-backend/CLAUDE.md.
# Dump pg_dump (format custom) → fichier compressé → sync Hetzner chiffré
# Exécuté automatiquement à 2h30 du matin via LaunchAgent
set -euo pipefail

NTFY_URL="http://localhost:8090/alo-backup"
PROJECT_ROOT="/Volumes/logousb/SSD/Projects/maisonnettev2"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/scripts/backup-restore/logs"
EXPANSION_BACKUP_DIR="/Volumes/Expansion12/sauvegarde-live-logo-projects/ALO"
PG_CONTAINER="postgres-shared"
PG_USER="postgres"
PG_DATABASE="logo"
PG_SCHEMA="alo"
mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$EXPANSION_BACKUP_DIR"

LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d).log"
RCLONE="/opt/homebrew/bin/rclone"
START_TIME=$(date +%s)

notify() {
  local title="$1" msg="$2" priority="${3:-default}"
  curl -s -H "Title: $title" -H "Priority: $priority" -d "$msg" "$NTFY_URL" || true
}

duration_human() {
  local seconds=$1
  local hours=$((seconds / 3600))
  local minutes=$(((seconds % 3600) / 60))
  printf "%dh%02dm" "$hours" "$minutes"
}

# Mode maintenance
if [ -f /tmp/alo-maintenance ]; then
  echo "==> Mode maintenance actif — sauvegarde ignorée ($(date))" | tee "$LOG_FILE" >&2
  exit 0
fi

echo "==> Sauvegarde ALO (PostgreSQL) démarrée ($(date))" | tee "$LOG_FILE" >&2

# Vérifier que le container Postgres tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  notify "ALO Backup échoué" "Container $PG_CONTAINER non démarré." "urgent"
  echo "==> ERREUR: container $PG_CONTAINER non démarré" | tee -a "$LOG_FILE" >&2
  exit 1
fi

# Dump du schéma alo (format custom pg_dump, compressé nativement)
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/alo-db-$BACKUP_TIMESTAMP.dump"

echo "==> Dump schéma $PG_SCHEMA (pg_dump) → $BACKUP_FILE..." | tee -a "$LOG_FILE" >&2
if ! docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DATABASE" -n "$PG_SCHEMA" -Fc > "$BACKUP_FILE" 2>>"$LOG_FILE"; then
  notify "ALO Dump échoué" "Impossible de dumper le schéma $PG_SCHEMA. Voir $LOG_FILE." "urgent"
  echo "==> ERREUR: Dump échoué" | tee -a "$LOG_FILE" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
echo "==> ✓ Dump créé: $SIZE" | tee -a "$LOG_FILE" >&2

# Vérifier intégrité du dump (format custom : pg_restore --list doit réussir)
echo "==> Vérification intégrité du dump..." | tee -a "$LOG_FILE" >&2
if ! docker exec -i "$PG_CONTAINER" pg_restore --list < "$BACKUP_FILE" > /dev/null 2>>"$LOG_FILE"; then
  notify "ALO Dump corrompu" "Le dump créé n'est pas un dump pg_restore valide." "urgent"
  rm "$BACKUP_FILE"
  exit 1
fi
echo "==> ✓ Intégrité OK" | tee -a "$LOG_FILE" >&2

# Vérifier espace disque
echo "==> Vérification espace disque..." | tee -a "$LOG_FILE" >&2
FREE_GB=$(df -g "$BACKUP_DIR" | awk 'NR==2{print $4}')
if [ "$FREE_GB" -lt 1 ]; then
  notify "ALO Espace critique" "Seulement ${FREE_GB}Go libres — sync Hetzner ignorée." "urgent"
  echo "==> ERREUR: Espace critique ($FREE_GB Go)" | tee -a "$LOG_FILE" >&2
  exit 1
fi
echo "==> Espace OK: ${FREE_GB}Go libres" | tee -a "$LOG_FILE" >&2

# Tier de sauvegarde selon le calendrier
TODAY=$(date +%Y%m%d)
DOW=$(date +%u)       # 1=lundi … 7=dimanche
DOM=$(date +%d)       # 01-31

if [ "$DOM" = "01" ]; then
  BACKUP_TIER="monthly"
  BACKUP_KEY=$(date +%Y%m)
elif [ "$DOW" = "7" ]; then
  BACKUP_TIER="weekly"
  BACKUP_KEY="$TODAY"
else
  BACKUP_TIER="daily"
  BACKUP_KEY="$TODAY"
fi

echo "==> Tier sauvegarde: $BACKUP_TIER/$BACKUP_KEY" | tee -a "$LOG_FILE" >&2

# Sync vers Hetzner chiffré
echo "==> Sync dumps vers Hetzner chiffré..." | tee -a "$LOG_FILE" >&2
$RCLONE sync "$BACKUP_DIR" "hetzner-crypt:alo/current" \
  --backup-dir "hetzner-crypt:alo/${BACKUP_TIER}/${BACKUP_KEY}" \
  --log-level INFO \
  --log-file "$LOG_FILE" \
  --min-age 5m || echo "==> WARN: Sync Hetzner échoué — continuer sans" | tee -a "$LOG_FILE" >&2

# Copie Expansion12 (live backup)
echo "==> Copie vers Expansion12..." | tee -a "$LOG_FILE" >&2
if cp "$BACKUP_FILE" "$EXPANSION_BACKUP_DIR/" 2>&1 | tee -a "$LOG_FILE"; then
  echo "==> ✓ Sauvegarde Expansion12 OK" | tee -a "$LOG_FILE" >&2
else
  echo "==> WARN: Copie Expansion12 échouée" | tee -a "$LOG_FILE" >&2
fi

# Rétention locale: garder 7 jours
echo "==> Nettoyage des anciens dumps (> 7 jours)..." | tee -a "$LOG_FILE" >&2
find "$BACKUP_DIR" -name "alo-db-*.dump" -mtime +7 -delete || true
echo "==> ✓ Nettoyage OK" | tee -a "$LOG_FILE" >&2

# Rétention Hetzner: purger anciennes versions (garder 7 daily, 4 weekly, 3 monthly)
echo "==> Application rétention Hetzner..." | tee -a "$LOG_FILE" >&2
for TIER in daily weekly monthly; do
  case "$TIER" in
    daily)   KEEP=7 ;;
    weekly)  KEEP=4 ;;
    monthly) KEEP=3 ;;
  esac

  echo "==> Purge versions $TIER (garder $KEEP)..." | tee -a "$LOG_FILE" >&2
  VERSIONS=$($RCLONE lsf "hetzner-crypt:alo/${TIER}/" --dirs-only 2>/dev/null | sort -r || true)
  COUNT=0

  for V in $VERSIONS; do
    COUNT=$((COUNT+1))
    if [ $COUNT -gt $KEEP ]; then
      echo "==> Purge alo/${TIER}/$V" | tee -a "$LOG_FILE" >&2
      $RCLONE purge "hetzner-crypt:alo/${TIER}/${V%/}" --log-file "$LOG_FILE" || true
    fi
  done
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_STR=$(duration_human "$DURATION")

echo "==> Sauvegarde terminée en $DURATION_STR ($(date))" | tee -a "$LOG_FILE" >&2
notify "ALO Sauvegarde OK" "Terminée en $DURATION_STR ($SIZE). Voir logs." "low"
