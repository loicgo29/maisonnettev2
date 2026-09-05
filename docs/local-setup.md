# Local Development Setup — maisonnettev2 + Authentik

Guide pour démarrer le stack complet en local sur votre machine (macOS / Linux).

## Prerequisites

- **Docker + Docker Compose** (ou Colima)
- **Node.js 20+**
- **PostgreSQL client tools** (optionnel, pour debug: `psql`, `pg_dump`)

## Architecture locale

```
http://localhost:9000          → Authentik IDP (admin UI, OAuth)
http://localhost:5432          → PostgreSQL (idp database)
http://localhost:6379          → Redis (idp cache)

http://localhost:5173          → maisonnettev2 Frontend (React)
http://localhost:3001          → maisonnettev2 Backend (Express/Fastify)
http://localhost:5433          → PostgreSQL (maisonnettev2 database, port différent pour ne pas confliter)
```

## Step 1: Clone & Configure Authentik (IDP)

```bash
cd /Volumes/logousb/SSD/Projects

# Cloner ou naviguer vers le repo idp
cd idp

# Configurer les variables d'environnement
cp .env.example .env

# Éditer .env et remplir:
# - PG_PASS: mot de passe PostgreSQL fort (ex: 32 caractères aléatoires)
# - AUTHENTIK_SECRET_KEY: clé secrète (générée par Authentik, ou utiliser openssl rand -base64 32)
# - AUTHENTIK_BOOTSTRAP_PASSWORD: mot de passe admin initial (ex: ChangeMe123!)
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optionnel pour tests, laisser vide si pas encore configuré)
# - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (optionnel pour tests)

nano .env   # ou ton éditeur favori

# Créer le répertoire de données PostgreSQL sur Expansion12
mkdir -p /Volumes/Expansion12/idp/postgres-data

# Démarrer le stack idp
docker-compose up -d

# Vérifier que tous les services sont healthy
docker-compose ps
# Les 4 services (postgres, redis, authentik-server, authentik-worker) doivent afficher STATUS "healthy" après ~30s

# Vérifier les logs si problème
docker-compose logs -f authentik-server   # Ctrl+C pour quitter

# Accéder à l'admin UI
open http://localhost:9000/if/admin/
# Login: admin@localhost / <AUTHENTIK_BOOTSTRAP_PASSWORD from .env>
```

## Step 2: Verify Authentik Application (maisonnettev2)

Dans l'admin UI Authentik (`http://localhost:9000/if/admin/`):

1. **Applications** → chercher `maisonnettev2`
   - Si présente (blueprint appliquée) ✓ → passer à Step 3
   - Si absent → blueprint non chargé, vérifier les logs worker:
     ```bash
     docker-compose logs authentik-worker | grep maisonnettev2
     ```

2. **Providers** → chercher `maisonnettev2`
   - Provider OAuth2 avec `client_type: public` et tokens 24h ✓

3. **Sources** → Google & GitHub
   - Doivent être présentes si `.env` configuré avec credentials
   - Sinon, placer en disabled pour l'instant

## Step 3: Clone & Configure maisonnettev2

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# Configurer frontend
cp frontend/.env.example frontend/.env.development

# Éditer et vérifier:
# VITE_AUTHENTIK_AUTHORITY=http://localhost:9000/application/o/maisonnettev2/
# VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
# VITE_API_URL=http://localhost:3001

# Configurer backend
cp backend/.env.example backend/.env

# Éditer et configurer:
# NODE_ENV=development
# PORT=3001
# DATABASE_URL=postgresql://maisonnettev2:<PASSWORD>@postgres-maisonnettev2:5432/maisonnettev2
# (remplacer <PASSWORD> avec un mot de passe, identique au .env docker-compose)
# Les autres clés (Stripe, Resend, etc.) peuvent rester vides pour dev

# Éditer docker-compose.yml et assurer:
# - DB_USER, DB_PASSWORD, DB_NAME alignés avec DATABASE_URL backend
# - KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/

cat > .env <<EOF
DB_USER=maisonnettev2
DB_PASSWORD=dev_password_change_me
DB_NAME=maisonnettev2
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/
SENTRY_ENVIRONMENT=development
OWNER_EMAIL=contact@maisonnettev2.local
OWNER_PHONE=+33612345678
EOF

# Créer répertoire PostgreSQL
mkdir -p ~/maisonnettev2_data   # ou un chemin local si pas sur Expansion12

# Démarrer les services (db + backend + frontend)
docker-compose up -d

# Vérifier les services
docker-compose ps
# Tous doivent être healthy après ~30s

# Vérifier les logs
docker-compose logs -f backend
```

## Step 4: Test Frontend + Backend

### Test Backend Health

```bash
curl http://localhost:3001/health
# Réponse attendue:
# {"status":"ok"}
```

### Test Frontend

```bash
open http://localhost:5173
# Vous devriez voir la page d'accueil (actuellement simple, à enrichir)
```

### Test Connexion OIDC (une fois OIDC implémenté en Phase B.3)

1. Cliquer sur "Login" (ou bouton équivalent)
2. Être redirigé vers `http://localhost:9000/if/flow/authorize/?...`
3. Choisir une méthode d'auth (Google / GitHub / email/password)
4. Être redirigé vers `http://localhost:5173/callback`
5. Token stocké en localStorage
6. Accès aux routes protégées du backend ✓

## Step 5: Database Management

### Accéder à la DB maisonnettev2

```bash
# Option 1: via Docker container
docker-compose exec postgres-maisonnettev2 psql -U maisonnettev2 -d maisonnettev2

# Option 2: via CLI si PostgreSQL installé localement
psql -h localhost -p 5433 -U maisonnettev2 -d maisonnettev2

# Commandes utiles:
# \dt              - lister les tables
# \d Gite          - décrire la table Gite
# SELECT * FROM Gite;  - afficher les gîtes
```

### Appliquer les migrations Prisma

```bash
cd backend
npx prisma migrate dev --name initial_schema
# Créera les tables selon le schema.prisma
```

### Réinitialiser la DB (dev uniquement)

```bash
cd backend
npx prisma migrate reset --force
# Supprime toutes les données, ré-exécute les migrations
# À utiliser UNIQUEMENT en dev local, jamais en prod!
```

## Step 6: Stop Services

```bash
# Arrêter maisonnettev2
cd /Volumes/logousb/SSD/Projects/maisonnettev2
docker-compose down

# Arrêter idp
cd /Volumes/logousb/SSD/Projects/idp
docker-compose down

# Pour nettoyer TOUS les volumes (data loss!):
docker-compose down -v
```

## Troubleshooting

### Authentik healthcheck échoue
```bash
docker-compose logs authentik-server | grep -i error
# Causes courantes:
# - PostgreSQL n'est pas démarré (vérifier postgres healthcheck)
# - Secrets manquants dans .env (AUTHENTIK_SECRET_KEY, AUTHENTIK_BOOTSTRAP_PASSWORD)
```

### maisonnettev2 backend connexion DB échouée
```bash
# Vérifier les credentials .env
cat backend/.env | grep DATABASE_URL

# Vérifier la DB accessible
docker-compose exec postgres-maisonnettev2 pg_isready -U maisonnettev2

# Si DB n'existe pas, la créer via Docker:
docker-compose exec postgres-maisonnettev2 createdb -U maisonnettev2 maisonnettev2
```

### Frontend ne peut pas joindre backend
```bash
# Vérifier que backend écoute sur 3001
curl -I http://localhost:3001/health

# Si 404, backend n'est pas démarré, vérifier les logs
docker-compose logs backend

# Si CORS error côté browser, vérifier backend CORS config
```

### OIDC login redirige vers Authentik mais revient pas
```bash
# Vérifier que la redirect URI est correcte dans Authentik Application
# Admin UI → Applications → maisonnettev2 → edit → Redirect URIs
# Doit contenir: http://localhost:5173/callback

# Vérifier les logs Authentik
docker-compose -f ../idp/docker-compose.yml logs authentik-server | grep -i callback
```

## Development Workflow

### Hot reload de code

**Frontend** (React):
- Les changements dans `frontend/src/` se reloadent automatiquement via Vite
- Aucune action nécessaire, regarder juste le navigateur

**Backend** (Node.js/Express):
- Si utilisant `--watch` ou `nodemon`, les changements se reloadent automatiquement
- Sinon, redémarrer manuellement: `docker-compose restart backend`

### Inspecting Database from Host

Si PostgreSQL CLI installé sur la machine:

```bash
# Login direct (au lieu de docker exec)
psql -h localhost -p 5433 -U maisonnettev2 -d maisonnettev2

# Requête rapide
psql -h localhost -p 5433 -U maisonnettev2 -d maisonnettev2 -c "SELECT COUNT(*) FROM Gite;"
```

## Next Steps

1. Implémenter OIDC (Phase B.3) selon `docs/oidc-integration.md`
2. Ajouter Swagger/OpenAPI (Phase B.2) pour documenter les endpoints
3. Créer les pages React (Home, GiteDetail, BookingForm)
4. Intégrer Google Calendar API
5. Intégrer Stripe payments
6. Ajouter healthchecks et monitoring
