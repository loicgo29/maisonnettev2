# OAuth2/Keycloak — Développement Local

## Configuration

En développement, `oauth2-proxy` pointe vers **Keycloak de production** pour tester l'authentification réelle sans dupliquer la config IDP.

```yaml
# docker-compose.yml
oauth2-proxy:
  command:
    - --oidc-issuer-url=https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2
    - --redirect-url=http://localhost:8030/oauth2/callback
```

**Important :** `http://localhost:8030/oauth2/callback` est whitelisté dans Keycloak prod pour les tests locaux.

---

## Démarrer l'environnement local

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# Charger les variables d'env (OAUTH2_CLIENT_ID, OAUTH2_CLIENT_SECRET, OAUTH2_COOKIE_SECRET)
./scriptslogo/setup/setup-env.sh

# Démarrer tous les services (inclus oauth2-proxy + Caddy avec forward_auth)
docker-compose up -d
```

---

## Tester le flux d'authentification

### 1. Accéder à une route protégée

```bash
# Terminal : test local
curl -I http://localhost:8030/admin
# Attendu : 401 Unauthorized (pas de token)
```

### 2. Initier le login OAuth2

```
http://localhost:8030/oauth2/start?rd=http://localhost:8030/admin
```

Tu devrais être redirigé vers Keycloak (prod) pour te connecter.

### 3. Identifiants de test

- **Username:** `logo-back` (ou tout user du realm maisonnettev2)
- **Password:** (défini dans Keycloak prod)

Après login, tu reviens à `http://localhost:8030/admin` avec accès ✅

---

## Routes protégées testables en local

| Route | Service | Protection |
|-------|---------|-----------|
| `/admin` | frontend (SvelteKit) | Keycloak ✅ |
| `/admin/alo` | alo-frontend | Keycloak ✅ |
| `/admin/comptabilite` | comptabilite-frontend | Keycloak ✅ |
| `/` | frontend | Public (pas d'auth) |

---

## Dépannage

### "unauthorized" au lieu de redirection Keycloak

Caddy retourne 401 sans lien login. Solution :
```
http://localhost:8030/oauth2/start?rd=http://localhost:8030/admin
```

Accède manuellement à cette URL pour initier le login.

---

## Architecture locale

```
Browser (localhost:8030)
    ↓
Caddy (port 80 dans docker)
    ├─ Route /admin → forward_auth oauth2-proxy:4180
    │       ↓
    │   oauth2-proxy valide token via Keycloak PROD
    │       ↓ (HTTP call)
    │   Keycloak prod (https://auth.maisonnette-pecheur-bertheaume.fr)
    │
    └─ Si token OK → pass to frontend:5173
      Si pas token → return 401
```

---

## Variables d'env requises

```bash
# .env (généré par setup-env.sh)
OAUTH2_CLIENT_ID=maisonnettev2-backoffice
OAUTH2_CLIENT_SECRET=<secret>
OAUTH2_COOKIE_SECRET=<random>
```

Voir `.env.example` pour la structure complète.

---

## Notes pour les devs

- ✅ Teste la vraie authentification (Keycloak prod) sans dupliquer la config
- ✅ Les headers `X-Auth-Request-User`, `X-Auth-Request-Email` sont réels
- ✅ Les tokens et sessions sont validés contre prod
- ⚠️ Dépend de la connexion Internet (Keycloak prod doit être accessible)

---

# Testing Automatisé — Mode Industriel

## 1. Obtenir un token Keycloak

```bash
# Charger les variables d'env d'abord
./scriptslogo/setup/setup-env.sh

# Obtenir un token (stdout)
./scripts/get-keycloak-token.sh logo-back <password>
# Sortie : eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Utiliser le token dans une requête
TOKEN=$(./scripts/get-keycloak-token.sh logo-back <password>)
curl -H "Cookie: _oauth2_proxy=${TOKEN}" https://maisonnette-pecheur-bertheaume.fr/admin
```

## 2. Tester toutes les routes protégées automatiquement

```bash
# Mode manuel (prod)
./scripts/test-oauth2-routes.sh

# Mode manuel (local)
./scripts/test-oauth2-routes.sh http://localhost:8030

# Mode CI (exit code non-zéro = failure)
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

**Sortie attendue :**
```
🧪 Test OAuth2/Keycloak — Routes protégées
...
1️⃣  Obtention du token...
✅ Token obtenu

2️⃣  Tests sans authentification (401 attendu):
  GET /admin → ✅ 401
  GET /admin/alo → ✅ 401
  GET /admin/comptabilite → ✅ 401

3️⃣  Tests avec authentification (200 attendu):
  GET /admin → ✅ 200
  GET /admin/alo → ✅ 200
  GET /admin/comptabilite → ✅ 502  # Service down, OK

4️⃣  Routes publiques (200 attendu):
  GET / → ✅ 200
  GET /api/calendar/public → ✅ 404

📊 Résultat: 8 ✅ / 0 ❌
```

---

## 3. Intégration CI/CD

### GitHub Actions — Test OAuth2 dans le CI

```yaml
# .github/workflows/ci.yml
- name: Test OAuth2/Keycloak routes (prod)
  run: |
    ./scriptslogo/setup/setup-env.sh  # Charge OAUTH2_CLIENT_SECRET
    ./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci
```

### Alias pour dev rapide

```bash
# ~/.zshrc ou ~/.bashrc
alias test-oauth2='cd ~/Projects/maisonnettev2 && ./scripts/test-oauth2-routes.sh http://localhost:8030'
```

---

## 4. Créer des utilisateurs de test

**Via la console Keycloak :**

1. Va à https://auth.maisonnette-pecheur-bertheaume.fr/admin
2. Login avec admin / <password Keycloak admin>
3. Realm → maisonnettev2 → Users → Add user
   - Username: `test-dev`
   - Email: `test-dev@example.com`
   - Set password (non-temporary)
4. Utilise ce user pour les tests :

```bash
./scripts/get-keycloak-token.sh test-dev <password>
```

---

## 5. Debugging des tokens

```bash
# Décoder un JWT (affiche les claims)
TOKEN=$(./scripts/get-keycloak-token.sh logo-back admin123)
echo "$TOKEN" | cut -d. -f2 | base64 -d | jq .

# Affiche :
# {
#   "exp": 1790442000,
#   "iat": 1790438400,
#   "email": "loic@logo-solutions.fr",
#   "name": "Loic Gourmelon",
#   "preferred_username": "logo-back"
# }

# Vérifier que oauth2-proxy reçoit le token
curl -v -H "Cookie: _oauth2_proxy=${TOKEN}" http://localhost:8030/admin 2>&1 | grep "X-Auth"
```

---

## Mode CI — Validation Production

### Déclencher manuellement

```bash
# Sur le serveur Hetzner :
ssh hetzner

# Test prod
cd /opt/maisonnettev2
export $(grep '^OAUTH2_CLIENT_ID\|^OAUTH2_CLIENT_SECRET' .env.production | xargs)
./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci

# Résultat: 0 = success, 1 = failure
```

### En GitHub Actions (post-deploy)

```yaml
# .github/workflows/test-prod.yml (déclenché après deploy)
name: Post-Deploy Test (Prod)
on:
  workflow_run:
    workflows: ["Deploy to Hetzner"]
    types: [completed]

jobs:
  test-oauth2:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: SSH vers Hetzner et tester
        run: |
          ssh -i ~/.ssh/hetzner_key deploy@hetzner \
            "cd /opt/maisonnettev2 && ./scripts/test-oauth2-routes.sh https://maisonnette-pecheur-bertheaume.fr --ci"
```

---

## Checklist — Avant de merger une PR

- [ ] `./scripts/test-oauth2-routes.sh http://localhost:8030` passe ✅
- [ ] Tous les users créés en local pour tester existent aussi en prod (ou utilise logo-back)
- [ ] Headers `X-Auth-Request-User` propagés aux services
- [ ] Pas de regression sur les routes publiques (`/`, `/api/calendar/public`)
