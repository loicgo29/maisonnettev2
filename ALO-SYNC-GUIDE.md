# ALO Sync Guide — Export/Import Dépenses Local → Hetzner

**Objectif :** Synchroniser les dépenses de la DB locale vers Hetzner en production, avec sauvegarde versionnée et possibilité de rollback.

---

## Vue d'ensemble

**Flux complet :**
```
Local DB (PostgreSQL) 
  ↓ (export → CSV)
alo-backup-<timestamp>.csv
  ↓ (SCP)
Hetzner /home/deploy/backups/
  ↓ (backup DB avant import)
alo-db-before-<timestamp>.sql.gz (sauvegarde)
  ↓ (rapatrier)
HDD6 /01-Froide/Backup/backupdb/alo/ (archivage)
  ↓ (import)
Hetzner DB (dépenses insérées)
```

**Source de vérité :** Local (une seule source)
**Fréquence :** Manuelle (déclenchée après changements ALO locaux)
**Rollback :** Possible via `alo-db-before-<timestamp>.sql.gz` archivé

---

## Prérequis

### 1. Accès SSH vers Hetzner
```bash
# Vérifier connexion
ssh hetzner "echo 'OK'" 
# Doit répondre : OK
```

**Config SSH attendue (`~/.ssh/config`) :**
```
Host hetzner
  HostName maisonnette-pecheur-bertheaume.fr
  User deploy
  IdentityFile ~/.ssh/maisonnettev2_hetzner
  ServerAliveInterval 30
```

### 2. Base de données locale
- **Engine :** PostgreSQL (port 5432 dans docker-compose)
- **Nom :** `maisonnettev2`
- **Schéma :** `alo`
- **Table :** `expenses` (et dépendances : `accounts`, `periods`, `sharing_entries`, etc.)

**Vérifier localement :**
```bash
docker-compose ps | grep postgres-maisonnettev2  # Doit être healthy
psql -U maisonnettev2 -h localhost -p 5433 -d maisonnettev2 -c "SELECT COUNT(*) FROM alo.expenses;"
```

### 3. Environnement local
- `.env` présent à la racine (`/Volumes/logousb/SSD/Projects/maisonnettev2/.env`)
- Contient `DATABASE_URL=postgresql://...`
- Scripts Python d'export/import présents :
  - `alo-backend/scripts/export-expenses.py`
  - `alo-backend/scripts/import-expenses.py`

### 4. Stockage archivage
- **HDD6 accessible :** `/Volumes/HDD6/01-Froide/Backup/backupdb/alo/`
- **Espace disque :** Au moins 1 GB disponible

---

## Processus Détaillé

### Phase 1 : Export Local

**Commande :**
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/alo-backend
bash ../scripts/alo-export-expenses.sh > alo-backup-$(date +%Y%m%d-%H%M%S).csv 2>export.log
```

**Résultat :**
- Fichier CSV : `alo-backup-<timestamp>.csv`
- Log : `export.log` (contient le nombre de dépenses exportées)

**Vérification :**
```bash
head -5 alo-backup-*.csv  # Affiche en-têtes + 1ère ligne
wc -l alo-backup-*.csv   # Compte les lignes
```

**Format CSV :**
```csv
id,date,amount,label,category,source,status,comment,sharing_mode,account_id,period_id,created_at,updated_at
1,2026-01-04,150.00,Courses,50/50,csv_import,frozen,,50/50,1,1,2026-01-04T...,2026-01-04T...
...
```

---

### Phase 2 : Backup DB Hetzner (avant import)

**Commande :**
```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="alo-db-before-$TIMESTAMP.sql.gz"
ssh hetzner "docker exec maisonnette-postgres pg_dump -U maisonnettev2 maisonnettev2 --schema=alo | gzip" > "/Volumes/HDD6/01-Froide/Backup/backupdb/alo/$BACKUP_FILE"
```

**Résultat :**
- Archive : `/Volumes/HDD6/01-Froide/Backup/backupdb/alo/alo-db-before-<timestamp>.sql.gz`
- Contient : Schéma `alo` complet (tables + données)

**Vérification :**
```bash
gunzip -t /Volumes/HDD6/01-Froide/Backup/backupdb/alo/alo-db-before-*.sql.gz
# Doit répondre : OK (sans erreur)
```

---

### Phase 3 : SCP CSV vers Hetzner

**Commande :**
```bash
BACKUP_FILE="alo-backup-<timestamp>.csv"
scp "$BACKUP_FILE" hetzner:/home/deploy/backups/
```

**Résultat :**
- Fichier sur Hetzner : `/home/deploy/backups/alo-backup-<timestamp>.csv`

---

### Phase 4 : Import CSV Hetzner

**Commande :**
```bash
BACKUP_FILE="alo-backup-<timestamp>.csv"
ssh hetzner "cd /opt/maisonnettev2/alo-backend && bash ../../scripts/alo-import-expenses.sh < /home/deploy/backups/$BACKUP_FILE"
```

**Résultat :**
- Dépenses insérées dans `maisonnettev2.alo.expenses` (Hetzner)
- `.alo-sync-timestamp` mis à jour (dernière sync)

**Vérification :**
```bash
ssh hetzner "docker exec maisonnette-postgres psql -U maisonnettev2 -d maisonnettev2 -c 'SELECT COUNT(*) FROM alo.expenses;'"
# Compare avec avant : doit avoir augmenté du nombre importé
```

---

## Script Automatisé

**Fichier :** `scripts/alo-sync-prod.sh`

**Usage :**
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# Sync complet (export + backup + SCP + import)
./scripts/alo-sync-prod.sh

# Sync sans import (juste export + backup + SCP, pas import)
./scripts/alo-sync-prod.sh --no-import
```

**Flux du script :**
1. ✅ Export dépenses locales → CSV
2. ✅ Backup DB Hetzner (schéma alo) → GZ
3. ✅ SCP CSV vers Hetzner
4. ✅ SCP GZ backup vers HDD6
5. ⚠️ Import CSV Hetzner (skip si `--no-import`)

**Sortie attendue :**
```
🔄 ALO: Export local → SCP Hetzner → Backup DB → Import
📦 Backup dir: /Volumes/HDD6/01-Froide/Backup/backupdb/alo
⏰ Timestamp: 20260918-140523

1️⃣  Export expenses (local)...
✅ Export créé: alo-backup-20260918-140523.csv (42 rows)

2️⃣  SCP → Hetzner...
✅ Fichier envoyé

3️⃣  Backup DB Hetzner (schéma ALO)...
✅ Backup DB créé (schéma alo)

4️⃣  Rapatrier sauvegardes → HDD6...
✅ Sauvegardes rapatriées

5️⃣  Import expenses Hetzner...
✅ Import complété

✅✅✅ Sync complète
```

---

## Rollback (en cas de problème)

**Scénario :** L'import a inséré des dépenses invalides, faut revenir en arrière.

**Procédure :**
```bash
# 1. Trouver le backup de la date du problème
ls -lh /Volumes/HDD6/01-Froide/Backup/backupdb/alo/alo-db-before-*.sql.gz

# 2. Restaurer sur Hetzner
BACKUP="alo-db-before-20260918-120000.sql.gz"  # À adapter
ssh hetzner "gunzip < /home/deploy/backups/$BACKUP | docker exec -i maisonnette-postgres psql -U maisonnettev2 -d maisonnettev2"

# 3. Vérifier
ssh hetzner "docker exec maisonnette-postgres psql -U maisonnettev2 -d maisonnettev2 -c 'SELECT COUNT(*) FROM alo.expenses;'"
```

---

## Troubleshooting

### Erreur : "DATABASE_URL not found" (export échoue)
**Cause :** `.env` parent n'est pas lu.
**Fix :**
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2
export $(grep '^DATABASE_URL' .env)
uv run python3 alo-backend/scripts/export-expenses.py
```

### Erreur : "Duplicate ID" (import échoue)
**Cause :** Une dépense avec cet ID existe déjà sur Hetzner.
**Fix :** Vérifier les IDs locaux vs Hetzner, ou modifier l'ID local avant réexport.

### Erreur : "Connection refused" (SCP vers Hetzner échoue)
**Cause :** Pas de connexion SSH vers Hetzner.
**Fix :**
```bash
ssh hetzner "echo test"  # Vérifier accès SSH
ssh-keygen -R maisonnette-pecheur-bertheaume.fr  # Réinitialiser clé SSH si nécessaire
```

### Erreur : "no such table: expenses" (Python échoue)
**Cause :** Script Python utilise SQLite au lieu de PostgreSQL.
**Fix :** Vérifier que le wrapper bash `scripts/alo-export-expenses.sh` exporte `DATABASE_URL` correctement.

---

## Métriques & Monitoring

**À vérifier après chaque sync :**

1. **Nombre de dépenses :**
   ```bash
   # Local
   psql -U maisonnettev2 -h localhost -p 5433 -d maisonnettev2 -c "SELECT COUNT(*) FROM alo.expenses WHERE updated_at > '2026-09-18'::date;"
   
   # Hetzner
   ssh hetzner "docker exec maisonnette-postgres psql -U maisonnettev2 -d maisonnettev2 -c 'SELECT COUNT(*) FROM alo.expenses WHERE created_at > NOW() - interval 1 day;'"
   ```

2. **Taille du backup :**
   ```bash
   ls -lh /Volumes/HDD6/01-Froide/Backup/backupdb/alo/alo-db-before-*.sql.gz | tail -1
   ```

3. **Dernière sync :**
   ```bash
   cat /Volumes/logousb/SSD/Projects/maisonnettev2/alo-backend/.alo-sync-timestamp
   ```

---

## Maintenance

### Nettoyer les vieux backups (garder 30 jours)
```bash
find /Volumes/HDD6/01-Froide/Backup/backupdb/alo -name "alo-*.sql.gz" -mtime +30 -delete
find /Volumes/HDD6/01-Froide/Backup/backupdb/alo -name "alo-*.csv" -mtime +30 -delete
```

### Archiver les backups mensuels
```bash
tar -czf /Volumes/HDD6/01-Froide/Backup/backupdb/alo/monthly-$(date +%Y%m).tar.gz \
  /Volumes/HDD6/01-Froide/Backup/backupdb/alo/alo-db-before-*.sql.gz
```

---

## FAQ

**Q : Faut-il arrêter les services avant sync ?**
A : Non, export lit la DB en lecture seule. Mais idéalement, faire la sync en dehors des heures de saisie.

**Q : Peux-tu importer plusieurs fois ?**
A : Non, si l'ID existe déjà, import échoue avec erreur "Duplicate ID". À faire une fois par export.

**Q : Qu'arrive-t-il si l'import échoue à mi-chemin ?**
A : Rollback via le backup `.alo-db-before-*.sql.gz` (voir section Rollback).

**Q : Combien de temps ça prend ?**
A : ~2-5 minutes (export 1min + backup 1min + SCP 1min + import 1min).

---

## Références

- **Scripts :**
  - Export : `alo-backend/scripts/export-expenses.py`
  - Import : `alo-backend/scripts/import-expenses.py`
  - Sync automatisé : `scripts/alo-sync-prod.sh`

- **Chemins clés :**
  - Local `.env` : `/Volumes/logousb/SSD/Projects/maisonnettev2/.env`
  - HDD6 backups : `/Volumes/HDD6/01-Froide/Backup/backupdb/alo/`
  - Hetzner backups : `/home/deploy/backups/`

- **Documentation :** Ce fichier (`ALO-SYNC-GUIDE.md`)

---

**Dernière mise à jour :** 2026-09-18
**Auteur :** Claude Haiku 4.5
