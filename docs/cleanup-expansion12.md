# Cleanup Expansion12 — Répertoires à supprimer

**Statut** : Prêt pour suppression (tous migrés vers Hetzner)

## Répertoires à supprimer

### 1. sauvegarde-live-logo-projects
- **Taille** : 131 MB
- **Statut migration** : ✅ Migré (Hetzner AOUT2026/)
- **Action** : `rm -rf /Volumes/Expansion12/sauvegarde-live-logo-projects`
- **Notes** : Backup ALO projects

### 2. Backup
- **Taille** : 22 GB
- **Statut migration** : ✅ Migré (Hetzner AOUT2026/Backup)
- **Action** : `rm -rf /Volumes/Expansion12/Backup`
- **Notes** : Immich backups (BD + fichiers)

### 3. backups
- **Taille** : 306 GB
- **Statut migration** : ✅ Migré (Hetzner AOUT2026/backups) — ~58 GB sans resource forks
- **Action** : `rm -rf /Volumes/Expansion12/backups`
- **Notes** : Backup de projets/SSD. Resource forks macOS non migrés (5.6 TB manquants)

### 4. SOURCES
- **Taille** : 6 TB
- **Statut migration** : ⏳ En cours (BorgBackup test SAUVFINALE)
- **Action** : `rm -rf /Volumes/Expansion12/SOURCES` — À FAIRE APRÈS COMPLETION BorgBackup
- **Notes** : Archive photos/vidéos familiales. BorgBackup avec déduplication en cours.

## Résumé

| Répertoire | Taille | Hetzner | Status |
|------------|--------|---------|--------|
| sauvegarde-live-logo-projects | 131 MB | ✅ | Prêt suppression |
| Backup | 22 GB | ✅ | Prêt suppression |
| backups | 306 GB | ✅ (partiel) | Prêt suppression |
| SOURCES | 6 TB | ⏳ BorgBackup | Attendre completion |

## Space libéré après suppression

**Total** = 131 MB + 22 GB + 306 GB + 6 TB = **6.3 TB**

**Résultat** : Expansion12 passera de ~312 GB utilisés à ~0 (vide)

## Commandes de suppression

```bash
rm -rf /Volumes/Expansion12/sauvegarde-live-logo-projects
rm -rf /Volumes/Expansion12/Backup
rm -rf /Volumes/Expansion12/backups
```

À NE PAS faire (garder SOURCES durant BorgBackup) :
```bash
# ⏳ Attendre fin BorgBackup SAUVFINALE
# rm -rf /Volumes/Expansion12/SOURCES
```

## Date création
- **Créé** : 2026-08-25
- **Mis à jour** : En attente completion BorgBackup

---

**⚠️ ATTENTION** : Vérifier que tous les fichiers sont bien sur Hetzner/BorgBackup avant suppression !
