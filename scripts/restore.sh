#!/bin/bash

# Restore script for maisonnettev2
# Usage: ./restore.sh <backup_file> [staging|prod]
# Restores database from backup file

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file> [staging|prod]"
    echo "Example: ./restore.sh backups/maisonnettev2-prod-20260823-143000.sql.gz prod"
    exit 1
fi

BACKUP_FILE="$1"
ENV=${2:-staging}

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[Restore] Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Verify backup is valid
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "[Restore] Error: Backup file is corrupted"
    exit 1
fi

if [ "$ENV" = "staging" ]; then
    PROJECT="maisonnettev2-staging"
    DB_NAME="maisonnettev2_staging"
    DB_USER="staging_user"
elif [ "$ENV" = "prod" ]; then
    PROJECT="maisonnettev2-prod"
    DB_NAME="maisonnettev2_prod"
    DB_USER="prod_user"
else
    echo "[Restore] Error: Unknown environment '$ENV'. Use 'staging' or 'prod'"
    exit 1
fi

echo "[Restore] ⚠️  WARNING: This will overwrite the $ENV database!"
echo "[Restore] Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "[Restore] Restore cancelled"
    exit 0
fi

echo "[Restore] Starting restore to $ENV..."

# Create database if it doesn't exist
echo "[Restore] Ensuring database exists..."
docker-compose -p "$PROJECT" exec -T postgres-maisonnettev2 \
    createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || true

# Restore from backup
echo "[Restore] Restoring database from $BACKUP_FILE..."
gzip -dc "$BACKUP_FILE" | docker-compose -p "$PROJECT" exec -T postgres-maisonnettev2 \
    psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "[Restore] ✅ Restore successful!"

    # Run migrations to ensure schema is up-to-date
    echo "[Restore] Running migrations to ensure schema is current..."
    docker-compose -p "$PROJECT" exec -T backend npx prisma migrate deploy || true

    echo "[Restore] ✅ Database restore complete!"
else
    echo "[Restore] ❌ Restore failed!"
    exit 1
fi
