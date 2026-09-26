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
