# Authentification Keycloak — Workflow

## Flux d'accès aux routes protégées (`/admin/*`)

### 1️⃣ Sans authentification

```
GET https://maisonnette-pecheur-bertheaume.fr/admin/alo
↓
HTTP 401 Unauthorized
```

Tu reçois **401** parce que tu n'as pas de token d'authentification.

### 2️⃣ Se connecter

Va à l'**URL de login** :
```
https://maisonnette-pecheur-bertheaume.fr/oauth2/start
```

Cela redirige vers **Keycloak login page**.

### 3️⃣ Identifiants

- **Username:** `admin`
- **Password:** `admin123`

(Ou ton compte Keycloak personnel si déjà créé)

### 4️⃣ Après login

Une fois connecté, tu es redirigé vers la route originale :
```
https://maisonnette-pecheur-bertheaume.fr/admin/alo
↓
HTTP 200 OK — Contenu ALO accessible
```

Caddy valide ton token via `oauth2-proxy` et te laisse accéder.

---

## Routes Protégées

| Route | Protection | Service |
|-------|-----------|---------|
| `/admin/alo*` | Keycloak | alo-frontend |
| `/admin*` | Keycloak | backoffice (SvelteKit) |
| `/` | Public | public (static) |

---

## Token et Cookies

- Token stocké dans un **cookie HttpOnly** secure
- Validé automatiquement par `oauth2-proxy` via `forward_auth` Caddy
- Expiration : **24 heures** (configurable)
- Logout automatique après expiration

---

## Dépannage

### "Unauthorized" au lieu de redirection Keycloak ?

C'est normal — le flow est :
1. Reçois 401 → Tu n'es pas authentifié
2. Va à `/oauth2/start` pour te connecter
3. Reviens à `/admin/alo` après login

**Amélioration UX future :** Ajouter une redirection automatique 401 → `/oauth2/start` via JavaScript ou error_page Caddy.

### Keycloak login page blanche ou erreur ?

- Vérifie que `auth.maisonnette-pecheur-bertheaume.fr` est accessible
- Vérifie les credentials
- Vérifi que le client Keycloak `maisonnettev2-backoffice` existe et est activé
- Check les logs Keycloak : `ssh hetzner "docker logs maisonnette-keycloak | tail -50"`

---

## Architecture

```
Client Browser
    ↓
Caddy (port 80/443)
    ├─ Route /admin/* → forward_auth oauth2-proxy:4180
    │       ↓
    │   oauth2-proxy validates token via Keycloak
    │       ↓
    │   If 2xx → pass to backoffice:5173
    │   If 401 → return 401 to client
    │
    └─ Route /oauth2/* → reverse_proxy oauth2-proxy:4180
            ↓
        oauth2-proxy handles /oauth2/start (redirect to Keycloak)
        oauth2-proxy handles /oauth2/callback (token exchange)
        oauth2-proxy handles /oauth2/auth (forward_auth check)
```

---

## Files

- `docker-compose.prod.yml` — oauth2-proxy + Keycloak config
- `caddy/Caddyfile.hetzner` — Routing + forward_auth setup
- `.env.production` — OAUTH2_CLIENT_ID, OAUTH2_CLIENT_SECRET, OAUTH2_COOKIE_SECRET
