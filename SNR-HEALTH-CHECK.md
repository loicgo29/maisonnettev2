# SNR Health Check & Comptabilité Testing

**Script de test SNR (Serveur Hetzner) pour Maisonnettev2**

## Vue d'ensemble

Script automatisé pour tester l'état de l'application sur Hetzner **sans redéploiement**. Permet de :
- ✅ Vérifier health checks (frontend, backend)
- ✅ Tester endpoints Sage OAuth2
- ✅ Vérifier authentification
- ✅ Documenter tous les problèmes rencontrés
- ✅ Accumuler l'historique dans `hetzner-test-results.md`

## Utilisation

### Test rapide
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2
./scripts/test-hetzner-health.sh
```

### Test détaillé (verbose)
```bash
./scripts/test-hetzner-health.sh --verbose
```

### Sauvegarder dans un fichier spécifique
```bash
./scripts/test-hetzner-health.sh --output /tmp/my-test.log
```

## Que teste le script

### Frontend
- `GET /` → Page d'accueil (HTTP 200)

### Backend Health
- `GET /api/health` → Vérification santé backend

### Authentification
- `POST /api/backoffice/auth/login` → Endpoint de connexion

### Sage OAuth (Comptabilité)
- `POST /api/admin/comptabilite/oauth/health` → Health check Sage
- `POST /api/admin/comptabilite/oauth/authorize` → Génération d'URL d'autorisation

### Calendar
- `GET /api/calendar/public` → Calendrier public

## Interprétation des résultats

### ✅ Tout passe
```
SUMMARY: 7 passed, 0 failed
```
→ L'application fonctionne normalement. Sage OAuth est en ligne.

### ❌ Sage OAuth échoue (502)
```
❌ Sage Health Check — Expected 200, got 502
❌ Sage Authorization URL Generation — Expected 200, got 502
```
**Cause probable :**
- Le backend n'a pas redémarré correctement après déploiement
- Migration Prisma Sage échoue au démarrage
- Le module `services/sage.ts` ne compile pas

**Solution :**
```bash
ssh admin@maisonnette-pecheur-bertheaume.fr
docker-compose -f docker-compose.prod.yml logs backend | tail -100
docker-compose -f docker-compose.prod.yml restart backend
```

### ❌ Backend health échoue (502)
```
❌ Backend Health — Expected 200, got 502
```
**Cause probable :**
- Container backend crashé
- Base de données non accessible
- Migration échouée

**Solution :**
```bash
ssh admin@maisonnette-pecheur-bertheaume.fr
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs db
docker-compose -f docker-compose.prod.yml restart
```

### ❌ Frontend échoue (502/404)
```
❌ Frontend Homepage — Expected 200, got 502
```
**Cause probable :**
- Caddy/reverse proxy échoue
- Container frontend crashé

**Solution :**
```bash
ssh admin@maisonnette-pecheur-bertheaume.fr
docker-compose -f docker-compose.prod.yml restart frontend
```

## Fichiers générés

Après chaque run :
- **Log détaillé** → `/tmp/hetzner-test-YYYYMMDD-HHMMSS.log`
- **Historique** → `hetzner-test-results.md` (accumule les runs)

Historique utile pour voir la progression des fixes et identifier les patterns de failure.

## Variables d'environnement

```bash
# Changer l'URL cible (défaut: https://maisonnette-pecheur-bertheaume.fr)
export HETZNER_URL=https://staging.example.com
./scripts/test-hetzner-health.sh
```

## Intégration Sage OAuth

Le script teste spécifiquement les nouveaux endpoints Sage ajoutés le **2026-09-26** :

| Endpoint | Méthode | Purpose |
|----------|---------|---------|
| `/api/admin/comptabilite/oauth/health` | POST | Vérifie que Sage OAuth est accessible et fonctionnel |
| `/api/admin/comptabilite/oauth/authorize` | POST | Génère une URL d'autorisation Sage |
| `/api/admin/comptabilite/oauth/callback` | POST | Échange le code d'auth pour un access token |
| `/api/admin/comptabilite/oauth/invoices/sync` | POST | Synchronise une facture vers Sage |
| `/api/admin/comptabilite/oauth/invoices/:id` | GET | Récupère le statut d'une facture Sage |

**Note :** Si ces endpoints retournent 502, voir section "Sage OAuth échoue" ci-dessus.

## Dépannage rapide

| Symptôme | Vérifier |
|----------|----------|
| Tous les endpoints 502 | `docker ps` — les containers tournent? |
| Sage 502, autres OK | `docker logs maisonnettev2-backend-1 \| grep -i sage\|error` |
| Frontend 502 | `docker logs maisonnettev2-caddy-1` |
| Intermittent 502 | Redémarrer: `docker-compose restart` |

## Prochaines améliorations

- [ ] Tester endpoints Sage avec auth (OAuth flow complet)
- [ ] Vérifier migration Prisma au démarrage
- [ ] Tester backup/restore sur Hetzner
- [ ] Alerter si heap memory > 80%
- [ ] GraphQL endpoints si disponibles

---

**Créé:** 2026-09-26  
**Dernière mise à jour:** 2026-09-26  
**Auteur:** Claude Code Script
