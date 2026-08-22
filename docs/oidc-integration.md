# OIDC Integration with Authentik

Ce document explique comment configurer maisonnettev2 pour s'authentifier via l'IDP Authentik centralisé.

## Architecture

```
maisonnettev2-frontend (React SPA)
       ↓ (OIDC Authorization Code + PKCE)
authentik (IdP, port 9000)
       ↓ (ID token + Access token)
maisonnettev2-frontend (with tokens in localStorage)
       ↓ (Authorization header: Bearer <access_token>)
maisonnettev2-backend (FastAPI)
       ↓ (JWKS validation)
Authentik JWKS endpoint (public)
```

## Prérequis

1. **Authentik opérationnel** : `cd ../idp && docker-compose up -d`
   - Accessible sur `http://localhost:9000`
   - Application `maisonnettev2` créée via blueprint (`blueprints/projects/maisonnettev2.yaml`)

2. **maisonnettev2 en local** : `docker-compose up -d`
   - Backend sur `http://localhost:3001`
   - Frontend sur `http://localhost:5173`
   - Postgres sur `localhost:5433`

## Frontend Configuration (React + oidc-client-ts)

### 1. Install dependency

```bash
cd frontend
npm install oidc-client-ts
```

### 2. Create `src/auth/OIDCManager.ts`

```typescript
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const authority = import.meta.env.VITE_AUTHENTIK_AUTHORITY || 'http://localhost:9000/application/o/maisonnettev2/';

export const userManager = new UserManager({
  authority,
  client_id: import.meta.env.VITE_AUTHENTIK_CLIENT_ID || 'maisonnettev2',
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  stateStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
});

export const getAuthHeaders = async () => {
  const user = await userManager.getUser();
  if (!user) return {};
  return { Authorization: `Bearer ${user.access_token}` };
};
```

### 3. Create callback route (`src/pages/Callback.tsx`)

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userManager } from '../auth/OIDCManager';

export function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await userManager.signinCallback();
        navigate('/');
      } catch (err) {
        console.error('Callback error:', err);
        navigate('/login-error');
      }
    })();
  }, [navigate]);

  return <div>Redirecting...</div>;
}
```

### 4. Add route in `src/App.tsx`

```typescript
<Route path="/callback" element={<Callback />} />
```

### 5. Environment variables (`.env.development`)

```
VITE_AUTHENTIK_AUTHORITY=http://localhost:9000/application/o/maisonnettev2/
VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
VITE_API_URL=http://localhost:3001
```

## Backend Configuration (Node.js Express)

### 1. Install dependencies

```bash
cd backend
npm install @types/node jose
```

(Utiliser `jose` pour valider JWT/JWKS au lieu de `jsonwebtoken` custom)

### 2. Create `src/middleware/auth.ts`

```typescript
import { jwtVerify } from 'jose';
import { NextFunction, Request, Response } from 'express';

const JWKS_URL = 'http://localhost:9000/application/o/maisonnettev2/jwks/';

let jwks: any;

async function getJWKS() {
  if (!jwks) {
    const res = await fetch(JWKS_URL);
    jwks = await res.json();
  }
  return jwks;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET || 'your-key')
      // Pour JWKS public (Authentik), utiliser le public key du JWKS, pas un secret
      // TODO: intégrer jwks-rsa pour ça
    );
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 3. Ajouter au `src/index.ts`

```typescript
import { authMiddleware } from './middleware/auth';

// Protected routes
app.get('/api/reservations', authMiddleware, async (req, res) => {
  // Utilisateur authentifié disponible dans (req as any).user
});
```

### 4. Environment variables (`.env`)

```
KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/
```

## Testing the Flow Locally

1. **Démarrer idp** :
   ```bash
   cd ../idp
   docker-compose up -d
   ```

2. **Démarrer maisonnettev2** :
   ```bash
   docker-compose up -d
   ```

3. **Accéder au frontend** :
   ```
   http://localhost:5173
   ```

4. **Cliquer sur "Login"** (formulaire à créer, page/bouton à ajouter au composant Header) :
   - Redirige vers Authentik
   - Login avec Google / GitHub / email
   - Retour à `/callback` avec un `code`
   - `oidc-client-ts` échange le code contre un access_token
   - Stockage en localStorage
   - Redirection vers `/`

5. **Appel API protégée** :
   - Frontend inclut `Authorization: Bearer <token>` via `getAuthHeaders()`
   - Backend valide via JWKS Authentik
   - Retour 200 si valide, 401 si invalide

## Debugging

### Frontend
- Console browser : vérifier que `userManager.getUser()` retourne un objet avec `access_token`
- Local Storage : clé `oidc.user:http://localhost:9000/application/o/maisonnettev2/` contient l'user sérialisé

### Backend
- Logs : afficher l'Authorization header reçu
- JWKS : `curl http://localhost:9000/application/o/maisonnettev2/jwks/` pour inspecter les clés publiques
- Token decode : `https://jwt.io` (copier le token du localStorage, décoder en debug)

## Next: PKCE Flow & Security

- Frontend `oidc-client-ts` supporte PKCE par défaut ✓
- Backend : utiliser `jwks-rsa` package pour valider tokens signés par Authentik public key (pas de secret partagé)
- HTTPS en prod (Caddy reverse proxy, cf NAS-logo-UI/Caddyfile)
