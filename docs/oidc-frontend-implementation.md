# OIDC Frontend Implementation — maisonnettev2

Cette doc couvre l'implémentation OIDC côté frontend (React + oidc-client-ts).

## Fichiers créés

### `src/auth/OIDCManager.ts`
- Configuration `UserManager` d'oidc-client-ts
- Authorité Authentik : `http://localhost:9000/application/o/maisonnettev2/`
- PKCE activé par défaut
- Auto-renew des tokens activé
- Fonctions publiques : `getUser()`, `login()`, `logout()`, `handleCallback()`, `getAuthHeaders()`

### `src/hooks/useAuth.ts`
- Hook React pour accéder à l'état d'auth global
- Retourne `{ user, isLoading, isAuthenticated, login, logout }`
- À utiliser dans n'importe quel composant : `const { user, login, logout } = useAuth();`

### `src/pages/Callback.tsx`
- Page de callback OAuth (`/callback`)
- Traite le redirect depuis Authentik
- Affiche un spinner pendant le traitement
- Redirige vers `/` en cas de succès, `/login` en cas d'erreur

### `src/lib/api.ts`
- Client HTTP Axios pré-configuré
- Ajoute automatiquement l'Authorization header à chaque requête
- Base URL : `VITE_API_URL` env var

### `public/silent-renew.html`
- Page requise par oidc-client-ts pour le renouvellement silencieux
- Appelée dans un iframe caché par `userManager`
- Permet de rafraîchir le token sans redirection

## Configuration Environment

Ajouter au `.env.development` (frontend):

```
VITE_AUTHENTIK_AUTHORITY=http://localhost:9000/application/o/maisonnettev2/
VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
VITE_API_URL=http://localhost:3001
```

Et au `.env.production`:

```
VITE_AUTHENTIK_AUTHORITY=https://idp.maisonnettev2.com/application/o/maisonnettev2/
VITE_AUTHENTIK_CLIENT_ID=maisonnettev2
VITE_API_URL=https://api.maisonnettev2.com
```

## Utilisation dans les composants

### Exemple basique — Check auth status

```typescript
import { useAuth } from '../hooks/useAuth';

export function MyComponent() {
  const { user, isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={login}>Login</button>;
  }

  return <div>Welcome, {user?.profile?.name}!</div>;
}
```

### Exemple — Appel API protégé

```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export function GitesList() {
  const { isAuthenticated } = useAuth();

  const { data: gites, isLoading } = useQuery({
    queryKey: ['gites'],
    queryFn: async () => {
      const res = await api.get('/api/gites');
      return res.data;
    },
    enabled: isAuthenticated, // ne lance la requête que si authentifié
  });

  if (isLoading) return <div>Loading...</div>;
  return <ul>{gites?.map(g => <li key={g.id}>{g.nom}</li>)}</ul>;
}
```

## Flow complet

1. **Accès à une page protégée**
   - Composant utilise `useAuth()`
   - Si pas authentifié, affiche bouton login

2. **Clic sur login**
   - `login()` appelle `userManager.signinRedirect()`
   - Redirige vers Authentik (`/application/o/maisonnettev2/authorize?...`)

3. **Login/OAuth sur Authentik**
   - Utilisateur se connecte (email/password, Google, GitHub)
   - Authentik redirige vers `/callback?code=...&state=...`

4. **Callback traité**
   - Page `/callback` appelle `handleCallback()`
   - `oidc-client-ts` échange le code contre un token JWT
   - Token + userinfo stockés en localStorage
   - Redirige vers `/`

5. **Accès protégé confirme**
   - Composant recharge après callback
   - `useAuth()` retrouve le user en localStorage
   - API calls incluent `Authorization: Bearer <token>` via interceptor

6. **Renouvellement silencieux** (auto)
   - 5 min avant expiration du token
   - `userManager` lance un requête silencieuse vers `/silent-renew.html`
   - Nouveau token obtenu sans redirection
   - Transparente pour l'utilisateur

## Routes à ajouter en React Router

```typescript
import { Callback } from './pages/Callback';
import { Login } from './pages/Login'; // À créer

<Routes>
  <Route path="/callback" element={<Callback />} />
  <Route path="/login" element={<Login />} />
  {/* autres routes */}
</Routes>
```

## Débogage

### Browser Console
```javascript
// Récupérer l'utilisateur actuel
import { getUser } from './src/auth/OIDCManager';
await getUser();

// Afficher le token
const user = await getUser();
console.log(user?.access_token);
```

### Local Storage
```javascript
// Clé unique par authority
localStorage.getItem('oidc.user:http://localhost:9000/application/o/maisonnettev2/')
```

### Network Tab
- Chercher requêtes vers `http://localhost:9000/`
- Vérifier que `/authorize`, `/token`, `/userinfo` réussissent

## Production Considerations

- HTTPS obligatoire en production (Authentik + Frontend + API)
- Redirect URI doit correspondre exactement (avec https://, pas http://)
- CORS doit permettre les origins correctes côté backend

Pour l'étape suivante (backend OIDC), voir `oidc-integration.md`.
