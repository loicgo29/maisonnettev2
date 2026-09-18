#!/bin/bash
set -e

# ALO: Export local → SCP Hetzner → Backup DB → Import
# Usage: ./scripts/alo-sync-to-prod.sh [--no-import]

BACKUP_DIR="/Volumes/HDD6/01-Froide/Backup/backupdb/alo"
HETZNER_HOST="hetzner"
PROJECT_ROOT="/Volumes/logousb/SSD/Projects/maisonnettev2"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="alo-backup-$TIMESTAMP.csv"
DB_BACKUP_FILE="alo-db-before-$TIMESTAMP.sql"

echo "🔄 ALO: Export local → SCP Hetzner → Backup DB → Import"
echo "📦 Backup dir: $BACKUP_DIR"
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

# 1. Export expenses from local DB
echo "1️⃣  Export expenses (local)..."
cd "$PROJECT_ROOT/alo-backend"
npm run alo:export-expenses > "$BACKUP_FILE" 2>export.log
if [ ! -s "$BACKUP_FILE" ]; then
  echo "❌ Export failed"
  cat export.log
  exit 1
fi
LINES=$(wc -l < "$BACKUP_FILE")
echo "✅ Export créé: $BACKUP_FILE ($LINES rows)"
cat export.log
echo ""

# 2. SCP vers Hetzner
echo "2️⃣  SCP → Hetzner..."
scp "$BACKUP_FILE" "$HETZNER_HOST:~/alo-backups/$BACKUP_FILE"
echo "✅ Fichier envoyé"
echo ""

# 3. Sauvegarde DB Hetzner (schéma ALO seulement)
echo "3️⃣  Backup DB Hetzner (schéma ALO)..."
ssh "$HETZNER_HOST" "pg_dump maisonnettev2 --schema=alo --no-privileges | gzip > ~/alo-backups/$DB_BACKUP_FILE.gz"
echo "✅ Backup DB créé (schéma alo)"
echo ""

# 4. Rapatrier sauvegardes en local (HDD6 froide)
echo "4️⃣  Rapatrier sauvegardes → HDD6..."
scp "$HETZNER_HOST:~/alo-backups/$DB_BACKUP_FILE.gz" "$BACKUP_DIR/"
scp "$HETZNER_HOST:~/alo-backups/$BACKUP_FILE" "$BACKUP_DIR/"
echo "✅ Sauvegardes rapatriées"
echo ""

# 5. Import expenses on Hetzner (optional — pass --no-import to skip)
if [[ "$1" != "--no-import" ]]; then
  echo "5️⃣  Import expenses Hetzner..."
  scp "$BACKUP_FILE" "$HETZNER_HOST:~/alo-backup.csv"
  ssh "$HETZNER_HOST" "cd /opt/maisonnettev2/alo-backend && npm run alo:import-expenses < ~/alo-backup.csv"
  echo "✅ Import complété"
else
  echo "5️⃣  [SKIPPED] Import expenses Hetzner"
  echo "   Pour importer, lancez:"
  echo "   $ scp $BACKUP_FILE $HETZNER_HOST:~/alo-backup.csv"
  echo "   $ ssh $HETZNER_HOST \"cd /opt/maisonnettev2/alo-backend && npm run alo:import-expenses < ~/alo-backup.csv\""
fi
echo ""

echo "✅✅✅ Sync complète"
echo "📁 Backups archivés: $BACKUP_DIR"
echo "   - $DB_BACKUP_FILE.gz (DB before import)"
echo "   - $BACKUP_FILE (expenses CSV)"
echo ""
echo "💡 Usage:"
echo "   ./scripts/alo-sync-to-prod.sh          # Sync complet + import"
echo "   ./scripts/alo-sync-to-prod.sh --no-import  # Sync seulement (pas d'import)"
