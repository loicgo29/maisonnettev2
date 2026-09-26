# Configuration OAuth2-Proxy + Keycloak

## 🔐 Setup du client Keycloak pour oauth2-proxy

Cette configuration protège toutes les routes `/admin` (alo, backoffice, comptabilite) par OAuth2 via Keycloak.

### 1. Créer un client dans Keycloak

**Accès à Keycloak Admin:**
```
https://auth.maisonnette-pecheur-bertheaume.fr/admin/
```

**Créer un client OIDC:**
1. **Realm:** `maisonnettev2`
2. **Clients → Create**
   - **Client ID:** `oauth2-proxy`
   - **Client type:** OpenID Connect
   - **Next → Save**

3. **Dans l'onglet "Settings":**
   - **Valid redirect URIs:** `https://maisonnette-pecheur-bertheaume.fr/oauth2/callback`
   - **Valid post logout redirect URIs:** `https://maisonnette-pecheur-bertheaume.fr`
   - **Web origins:** `https://maisonnette-pecheur-bertheaume.fr`
   - **Save**

4. **Dans l'onglet "Credentials":**
   - Copier le **Client Secret**

### 2. Ajouter les secrets à Bitwarden

Créer un élément Bitwarden `maisonnettev2-oauth2-proxy` avec:
- **username:** `OAUTH2_CLIENT_ID` (valeur: client ID du client Keycloak)
- **password:** `OAUTH2_CLIENT_SECRET` (valeur: client secret)
- **Notes:** Ajouter `OAUTH2_COOKIE_SECRET` (générer avec `openssl rand -hex 32`)

### 3. Charger les secrets dans `.env.production`

```bash
cd /Volumes/logousb/SSD/Projects
./scriptslogo/setup/setup-env.sh --prod
```

Cela ajoute automatiquement :
- `OAUTH2_CLIENT_ID`
- `OAUTH2_CLIENT_SECRET`
- `OAUTH2_COOKIE_SECRET`

### 4. Vérifier en production

```bash
ssh hetzner
docker exec -it maisonnette-oauth2-proxy curl -I http://127.0.0.1:4180/ping
# Expected: HTTP 200 OK
```

### 5. Tester l'authentification

1. Naviguer vers: `https://maisonnette-pecheur-bertheaume.fr/admin/alo`
2. Vous êtes redirigé vers Keycloak pour vous authentifier
3. Après connexion, accès à `/admin/alo` et autres routes

## Routes protégées par OAuth2

- `/admin` (backoffice principal)
- `/admin/alo` (comptabilité)
- `/admin/comptabilite` (relance)

## Si les secrets ne sont pas chargés

oauth2-proxy refuse de démarrer avec:
```
OAUTH2_CLIENT_ID manquant
OAUTH2_CLIENT_SECRET manquant
OAUTH2_COOKIE_SECRET manquant
```

**Relancer après avoir configuré les secrets Bitwarden:**
```bash
ssh hetzner
docker-compose -f docker-compose.prod.yml restart oauth2-proxy caddy
```

## Troubleshooting

| Problème | Solution |
|----------|----------|
| `redirect_uri_mismatch` | Vérifier que la redirect URI dans Keycloak = `https://maisonnette-pecheur-bertheaume.fr/oauth2/callback` |
| `invalid_client_secret` | Vérifier le secret dans Bitwarden et Keycloak |
| oauth2-proxy ne démarre pas | Vérifier que `OAUTH2_COOKIE_SECRET` est un hex string de 32 caractères |

---

**Référence:**
- [oauth2-proxy docs](https://oauth2-proxy.github.io/oauth2-proxy/)
- [Keycloak OIDC Client](https://www.keycloak.org/docs/latest/server_admin/#_oidc_clients)
