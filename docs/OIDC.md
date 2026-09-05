# OIDC Documentation — maisonnettev2

Point d'entrée pour toute la documentation sur l'authentification OIDC via Authentik.

## 📚 Documentation disponible

### [Complete Flow](./oidc-complete-flow.md)
Vue d'ensemble du flux complet OIDC, de la première visite à l'appel API protégé.
Inclut des diagrammes ASCII, scenarios d'expiration de token, logout, etc.

**Commencer ici** pour comprendre le flux end-to-end.

### [Frontend Implementation](./oidc-frontend-implementation.md)
Implémentation côté React (oidc-client-ts, hooks, pages).

Couvre:
- Configuration `OIDCManager.ts`
- Hook `useAuth()` pour accéder à l'état global
- Page `Callback.tsx` pour traiter le redirect
- Client HTTP Axios avec interceptor pour les headers OIDC
- Débogage et local storage

### [Backend Implementation](./oidc-backend-implementation.md)
Implémentation côté Node.js/Express (Jose, JWKS validation).

Couvre:
- Middleware `verifyOIDCToken` pour valider les JWT
- Routes protégées (`/api/reservations`)
- Validation de la signature via JWKS Authentik
- Utilisation de `req.user` dans les routes

### [Integration Guide](./oidc-integration.md) (Original)
Guide d'intégration détaillé avec configuration .env et troubleshooting.

## 🚀 Quick Start

### 1. Vérifier que Authentik fonctionne

```bash
# Dans un terminal
cd /Volumes/logousb/SSD/Projects/idp
docker-compose up -d
docker-compose ps  # Tous les services doivent être healthy

# Vérifier que l'Application maisonnettev2 existe
open http://localhost:9000/if/admin/
# Login: admin@localhost / <your-password>
# Aller à Applications → maisonnettev2
```

### 2. Configurer maisonnettev2

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# .env (docker-compose)
cat > .env <<EOF
DB_USER=maisonnettev2
DB_PASSWORD=dev_password
DB_NAME=maisonnettev2
KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/
EOF

# frontend/.env.development
cat > frontend/.env.development <<EOF
VITE_AUTHENTIK_AUTHORITY=http://localhost:9000/application/o/maisonnettev2/
VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
VITE_API_URL=http://localhost:3001
EOF

# backend/.env
cp backend/.env.example backend/.env
# Éditer: DATABASE_URL = postgresql://maisonnettev2:dev_password@postgres-maisonnettev2:5432/maisonnettev2

# Démarrer
docker-compose up -d
```

### 3. Tester le flow

**Frontend health check:**
```bash
curl http://localhost:5173  # Devrait charger la page
```

**Backend API:**
```bash
curl http://localhost:3001/health  # Devrait retourner { status: "healthy" }
```

**Swagger docs:**
```bash
open http://localhost:3001/api/docs
```

## 🔌 Configuration Environment

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_AUTHENTIK_AUTHORITY` | `http://localhost:9000/application/o/maisonnettev2/` | Authentik realm URL (avec trailing slash) |
| `VITE_AUTHENTIK_CLIENT_ID` | `maisonnettev2` | OAuth2 client ID |
| `VITE_API_URL` | `http://localhost:3001` | Backend API base URL |

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_REALM_URL` | *(required)* | Authentik realm URL (avec trailing slash) |
| `DATABASE_URL` | *(required)* | PostgreSQL connection string |
| `SENTRY_DSN` | *(optional)* | Sentry error tracking |
| `SENTRY_ENVIRONMENT` | `development` | Environment tag |

## 🔐 Security Checklist

Avant la production:

- [ ] HTTPS partout (Caddy/Nginx reverse proxy)
- [ ] Redirect URIs correctes dans Authentik (https, exact match)
- [ ] CORS restreint à l'origin frontend
- [ ] PKCE activé (par défaut dans oidc-client-ts)
- [ ] MFA activé sur les comptes admins Authentik
- [ ] Tokens JWT signés (RSA par Authentik)
- [ ] Rate limiting sur les endpoints d'auth
- [ ] Secrets (AUTHENTIK_SECRET_KEY) générés aléatoirement
- [ ] Audit logging Authentik activé

## 🧪 Testing

### Test manual

1. Accéder à `http://localhost:5173`
2. Cliquer sur "Login" (ou page de login à créer)
3. Être redirigé vers Authentik
4. Se connecter avec email/password
5. Être redirigé vers `/callback` puis `/`
6. Voir un message de bienvenue ou contenu protégé

### Test API protégé

```bash
# Récupérer le token (depuis localStorage du browser dev tools)
TOKEN="eyJhb..."

# Appel API sans token → 401
curl http://localhost:3001/api/reservations
# {"error":"Missing or invalid authorization header"}

# Appel API avec token → 200
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/reservations
# [...]

# Appel avec mauvais token → 401
curl -H "Authorization: Bearer invalid" http://localhost:3001/api/reservations
# {"error":"Invalid token"}
```

## 🔧 Troubleshooting

### "Invalid client" error in browser

- Vérifier que `VITE_AUTHENTIK_CLIENT_ID` correspond au nom de l'Application dans Authentik
- Vérifier que l'Application `maisonnettev2` existe dans Authentik admin

### "Redirect URI mismatch"

- Vérifier que `VITE_AUTHENTIK_AUTHORITY` a un trailing slash
- Vérifier que la Redirect URI dans Authentik Application contient exactement `http://localhost:5173/callback`
- En production, doit être `https://...`

### "Invalid token" sur l'API

- Vérifier que le token n'est pas expiré (localStorage → `oidc.user:...` → `access_token`)
- Vérifier que `KEYCLOAK_REALM_URL` backend correspond à l'authority frontend
- Vérifier que JWKS est accessible: `curl http://localhost:9000/application/o/maisonnettev2/jwks/`

### CORS error

```
Access to XMLHttpRequest at 'http://localhost:3001/api/...' blocked by CORS policy
```

- Vérifier backend CORS config dans `index.ts`
- Frontend origin doit être dans le whitelist CORS

## 📖 Next Steps

1. **Implémenter les pages React** (Home, GiteDetail, BookingForm)
2. **Créer des composants protégés** (utiliser useAuth hook)
3. **Intégrer Stripe** pour les paiements
4. **Intégrer Google Calendar** pour la synchronisation des disponibilités
5. **Ajouter l'observabilité** (Sentry, logs structurés)
6. **CI/CD** (GitHub Actions pour dev/staging/prod)

## 📞 Resources

- [Authentik docs](https://docs.authentik.io/) — official docs
- [oidc-client-ts docs](https://github.com/authts/oidc-client-ts) — frontend library
- [Jose docs](https://github.com/panva/jose) — JWT validation library
- [OpenID Connect spec](https://openid.net/connect/) — protocol spec
- [RFC 7636 (PKCE)](https://tools.ietf.org/html/rfc7636) — PKCE flow
