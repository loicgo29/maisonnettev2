# Test Local OAuth2-Proxy + Keycloak Production

Guide pour tester `oauth2-proxy` en local en se branchant sur le **Keycloak en production** (Hetzner).

## 🔧 Setup Conditions Préalables

### 1. Créer le client Keycloak OAuth2-Proxy (en production)

SSH vers Hetzner et accédez à Keycloak Admin :
```bash
ssh hetzner
# http://localhost:9000/admin/ (Caddy proxifie auth.* en HTTPS)
# Ou via le tunnel SSH en forward: ssh -L 9000:localhost:8080 hetzner
```

**Créer un client pour le test local :**
1. **Realm:** `maisonnettev2`
2. **Clients → Create**
   - **Client ID:** `oauth2-proxy-local`
   - **Client type:** OpenID Connect
   - **Next → Save**

3. **Dans l'onglet "Settings":**
   - **Valid redirect URIs:** `http://localhost:8030/oauth2/callback`
   - **Valid post logout redirect URIs:** `http://localhost:8030`
   - **Web origins:** `localhost:8030`
   - **Save**

4. **Dans l'onglet "Credentials":**
   - Copier le **Client Secret**

### 2. Ajouter les secrets en `.env` local (dev)

Créer un fichier `.env.oauth2-local` :
```bash
# Secrets pour tester oauth2-proxy en local
OAUTH2_CLIENT_ID=oauth2-proxy-local
OAUTH2_CLIENT_SECRET=<copier depuis Keycloak>
OAUTH2_COOKIE_SECRET=$(openssl rand -hex 32)

# Keycloak en production (pas local)
OIDC_ISSUER_URL=https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2
```

### 3. Modifier `docker-compose.yml` pour le test

**Remplacer le service oauth2-proxy en local :**

```yaml
oauth2-proxy:
  image: quay.io/oauth2-proxy/oauth2-proxy:v7.6.0
  container_name: maisonnettev2-oauth2-proxy
  restart: unless-stopped
  command: |
    --provider=oidc
    --oidc-issuer-url=https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2
    --client-id=oauth2-proxy-local
    --client-secret=${OAUTH2_CLIENT_SECRET}
    --redirect-url=http://localhost:8030/oauth2/callback
    --cookie-secure=false
    --cookie-httponly=true
    --cookie-samesite=lax
    --cookie-name=_oauth2_proxy
    --cookie-secret=${OAUTH2_COOKIE_SECRET}
    --http-address=0.0.0.0:4180
    --email-domains=*
    --pass-basic-auth=false
    --skip-provider-button=false
    --scope=openid profile email
  environment:
    OAUTH2_PROXY_SKIP_AUTH_ROUTES: /health,/health/live
  depends_on:
    - caddy
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://127.0.0.1:4180/ping']
    interval: 30s
    timeout: 5s
    retries: 3
  networks:
    - maisonnette-network
```

**Notes:**
- `--cookie-secure=false` (en local, pas de HTTPS)
- `--redirect-url=http://localhost:8030/oauth2/callback` (local, pas le domaine de prod)
- `client-id=oauth2-proxy-local` (le client test créé en Keycloak)

### 4. Démarrer localement

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# Charger les secrets
export $(cat .env.oauth2-local | xargs)

# Lancer le stack local (avec oauth2-proxy)
docker-compose up -d

# Vérifier que oauth2-proxy démarre correctement
docker-compose logs -f oauth2-proxy
```

### 5. Tester l'authentification

1. Naviguer vers : `http://localhost:8030/admin/alo`
2. Vous êtes redirigés vers `https://auth.maisonnette-pecheur-bertheaume.fr/login`
3. Authentifiez-vous avec vos credentials Keycloak
4. Après connexion, accédez à `/admin/alo`

**Routes à tester :**
- `http://localhost:8030/admin` (backoffice)
- `http://localhost:8030/admin/alo` (comptabilité)
- `http://localhost:8030/admin/comptabilite` (relance)

### 6. Vérifier les logs

```bash
# Logs du proxy
docker-compose logs -f oauth2-proxy

# Logs de Caddy (routage)
docker-compose logs -f caddy

# Vérifier la communication avec Keycloak
curl -v http://localhost:4180/ping
```

## 🐛 Troubleshooting

| Erreur | Cause | Fix |
|--------|-------|-----|
| `redirect_uri_mismatch` | Client Keycloak n'a pas la redirect URI | Vérifier dans Keycloak Admin : `oauth2-proxy-local` → Settings → Valid redirect URIs = `http://localhost:8030/oauth2/callback` |
| `invalid_client_secret` | Secret incorrect ou expiré | Régénérer dans Keycloak → Credentials |
| `connection refused` | oauth2-proxy ne démarre pas | `docker-compose logs oauth2-proxy` pour voir l'erreur |
| `OIDC connection error` | Keycloak est inaccessible | Vérifier avec `curl https://auth.maisonnette-pecheur-bertheaume.fr/.well-known/openid-configuration` |
| Loop infini de redirects | Cookie-path mismatch | Vérifier que `--cookie-secure=false` en local |

## ✅ Que tester

- [ ] Accès à `/admin/alo` sans authentification → redirige vers Keycloak
- [ ] Après connexion → accès à `/admin/alo`
- [ ] Accès à `/admin/comptabilite` → protégé aussi
- [ ] Logout → cookie effacé
- [ ] Accès au public (/) → fonctionne sans auth
- [ ] API (`/api/*`) → fonctionne sans auth

## Après test réussi

Si tout fonctionne en local avec Keycloak de production, on peut :
1. Merger la branche `feat/admin-oauth2-keycloak`
2. Créer le client `oauth2-proxy` en production
3. Ajouter les secrets en production
4. Déployer

---

**Référence:**
- [oauth2-proxy OIDC](https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/oidc/)
- [Keycloak OIDC Discovery](https://auth.maisonnette-pecheur-bertheaume.fr/.well-known/openid-configuration)
