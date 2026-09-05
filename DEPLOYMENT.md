# Maisonnettev2 — Déploiement & CI/CD

## Architecture de déploiement

```
GitHub (main branch)
    ↓ (push trigger)
GitHub Actions CI/CD
    ↓
1. Générer .env.production depuis GitHub secrets
2. Transférer .env.production à Hetzner via SSH+scp
3. Sync code du repo (git archive)
4. Exécuter deploy.sh sur Hetzner
5. Redémarrer containers (docker-compose up -d)
```

## Secrets GitHub requis

Tous les secrets sont **déjà configurés** dans **Settings → Secrets and variables → Actions**.

### Infrastructure (Hetzner) ✅
```
HETZNER_DEPLOY_HOST       = maisonnette-pecheur-bertheaume.fr
HETZNER_DEPLOY_USER       = deploy
HETZNER_DEPLOY_KEY        = Clé SSH privée (configurée)
```

### Base de données ✅
```
DB_PASSWORD                = Mot de passe PostgreSQL
```

### Keycloak (Authentification) ✅
```
KC_DB_PASSWORD             = Mot de passe DB Keycloak
KC_ADMIN_PASSWORD          = Mot de passe admin Keycloak
```

### Google Calendar (OAuth2) ✅
```
PRIVATE_GOOGLE_CLIENT_ID       = ID client Google
PRIVATE_GOOGLE_CLIENT_SECRET   = Secret client Google
PRIVATE_GOOGLE_REDIRECT_URI    = https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback
PRIVATE_GITE_CALENDAR_ID       = primary
```

### Email (Resend) ✅
```
RESEND_API_KEY             = Clé API Resend
```

## Configuration locale (développement)

### Générer .env depuis Bitwarden

```bash
# Unique: déverrouiller Bitwarden (stocke session dans trousseau macOS)
./setup-env.sh unlock

# Toutes les fois ensuite:
./setup-env.sh
# Génère: maisonnettev2/.env

# Production (si besoin de générer localement):
./setup-env.sh --prod
# Génère: maisonnettev2/.env.production (ne pas commiter!)
```

### Items Bitwarden attendus

- `maisonnettev2-email` (dev) → `resend_api_key`
- `maisonnettev2-email-prod` (prod) → `resend_api_key`
- `maisonnettev2-keycloak` → `kc_db_password`, `kc_admin_user`, `kc_admin_password`
- `maisonnettev2-google` → `client_id`, `client_secret`, `redirect_uri`, `calendar_id`
- `maisonnettev2-prod-db` → `db_password`

## Déploiement automatique

### Déclencher un déploiement

```bash
git push origin main
# GitHub Actions détecte le push et lance:
# 1. CI (tests, lint, type check)
# 2. Deploy workflow
```

### Forcer un redéploiement

```bash
# Via GitHub UI: Actions → Deploy to Hetzner → Run workflow
# Ou en local:
gh workflow run deploy-hetzner.yml
```

### Voir les logs de déploiement

```bash
# Via GitHub UI: Actions → Deploy to Hetzner → Latest run
# Ou en local:
gh run view --log
```

## Vérification post-déploiement

```bash
# Tester l'endpoint santé
curl https://maisonnette-pecheur-bertheaume.fr/api/health | jq .

# Vérifier Google Calendar callback
curl "https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback?code=test"
# Doit ne PLUS retourner "Could not determine client ID"

# Vérifier les logs du container
ssh deploy@maisonnette-pecheur-bertheaume.fr "docker logs maisonnettev2-backend-1 | tail -20"

# Redémarrer manuellement si besoin
ssh deploy@maisonnette-pecheur-bertheaume.fr "cd /opt/maisonnettev2 && docker-compose -f docker-compose.prod.yml restart"
```

## Troubleshooting

### Erreur: "Could not determine client ID from request" (Google Calendar)

**Cause:** `PRIVATE_GOOGLE_CLIENT_ID` ou `PRIVATE_GOOGLE_CLIENT_SECRET` manquant.

**Solution:**
1. Vérifier que `PRIVATE_GOOGLE_CLIENT_ID` et `PRIVATE_GOOGLE_CLIENT_SECRET` sont dans GitHub Secrets
2. Relancer le déploiement: `gh workflow run deploy-hetzner.yml`

### Erreur: "Permission denied (publickey)" au déploiement

**Cause:** Clé SSH non valide ou hosts file pas à jour.

**Solution:**
1. Vérifier `HETZNER_DEPLOY_KEY` dans GitHub Secrets
2. Tester la clé localement: `ssh -i ~/.ssh/deploy_key deploy@maisonnette-pecheur-bertheaume.fr "echo OK"`

### Erreur: ".env not found" après déploiement

**Cause:** Le transfert scp du .env.production a échoué silencieusement.

**Solution:**
1. Vérifier les logs du workflow GitHub Actions
2. Tester manuellement: `ssh deploy@maisonnette-pecheur-bertheaume.fr "ls -la /opt/maisonnettev2/.env*"`

## Flux des secrets

```
Bitwarden (coffre sécurisé)
    ↓ (fetch automatique par setup-env.sh local)
.env.production (local, pas commité)
    ↓ (généré par GitHub Actions depuis les secrets)
Hetzner (/opt/maisonnettev2/.env)
    ↓ (lu par docker-compose)
Containers (backend, frontend, postgres, keycloak)
```

## Checklist post-déploiement

- [x] Configurer tous les GitHub Secrets ✅ (tous présents)
- [x] Clé SSH déploiement vers Hetzner ✅
- [x] Workflow CI/CD implémenté ✅
- [ ] Trigger redéploiement après push: `gh workflow run deploy-hetzner.yml`
- [ ] Vérifier health endpoint: `curl https://maisonnette-pecheur-bertheaume.fr/api/health`
- [ ] Tester Google Calendar OAuth2: `curl "https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback?code=test"`
- [ ] Vérifier que `/api/calendar/callback` accepte maintenant GET

## Références

- **CI Pipeline:** `.github/workflows/ci.yml`
- **Deploy Pipeline:** `.github/workflows/deploy-hetzner.yml`
- **Setup Local:** `./setup-env.sh --help`
- **Production Entrypoint:** `deploy.sh` (sur Hetzner)
