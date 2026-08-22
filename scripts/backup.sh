#!/bin/bash

# Backup script for maisonnettev2
# Usage: ./backup.sh [staging|prod]
# Backs up database to encrypted file

set -e

ENV=${1:-staging}
BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/maisonnettev2-$ENV-$TIMESTAMP.sql.gz"

echo "[Backup] Starting backup for $ENV environment..."

if [ "$ENV" = "staging" ]; then
    PROJECT="maisonnettev2-staging"
    DB_NAME="maisonnettev2_staging"
    DB_USER="staging_user"
elif [ "$ENV" = "prod" ]; then
    PROJECT="maisonnettev2-prod"
    DB_NAME="maisonnettev2_prod"
    DB_USER="prod_user"
else
    echo "[Backup] Error: Unknown environment '$ENV'. Use 'staging' or 'prod'"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# Dump database
echo "[Backup] Dumping database $DB_NAME..."
docker-compose -p "$PROJECT" exec -T postgres-maisonnettev2 \
    pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[Backup] ✅ Backup successful: $BACKUP_FILE ($SIZE)"

    # Keep only last 7 daily backups
    echo "[Backup] Cleaning old backups (keep 7 days)..."
    find "$BACKUP_DIR" -name "maisonnettev2-$ENV-*.sql.gz" -mtime +7 -delete

    # Verify backup is readable
    echo "[Backup] Verifying backup integrity..."
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        echo "[Backup] ✅ Backup integrity verified"
    else
        echo "[Backup] ❌ Backup verification failed!"
        exit 1
    fi
else
    echo "[Backup] ❌ Backup failed!"
    exit 1
fi
