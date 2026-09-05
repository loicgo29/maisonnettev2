# Complete OIDC Flow — End-to-End

Vue d'ensemble du flux complet OIDC dans maisonnettev2, de l'authentification initiale à l'appel API protégé.

## Architecture

```
┌─────────────────────┐
│   Frontend (React)  │  Port 5173
│  + oidc-client-ts   │
└──────────┬──────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌─────────────────────┐          ┌──────────────────────┐
│  Authentik (IdP)    │          │ Backend (Express)    │
│ Port 9000           │          │ Port 3001            │
│ + OAuth2/OIDC       │          │ + Jose (JWKS valid)  │
│ + Google/GitHub     │          │ + Protected routes   │
└─────────────────────┘          └──────────────────────┘
           │                              │
           └──────────────────────────────┘
                   JWKS endpoint
                (public key validation)

┌─────────────────────┐
│  PostgreSQL (DB)    │
│ Port 5433           │
│ (maisonnettev2_db)  │
└─────────────────────┘
```

## Step-by-Step Flow

### 1️⃣ Utilisateur accède au frontend

```
User: https://localhost:5173
Browser:
  ✓ Charge App.tsx
  ✓ useAuth() hook lance getUser()
  ✓ Cherche le token en localStorage → pas trouvé
  ✓ isAuthenticated = false
  ✓ Affiche: <button onClick={login}>Login</button>
```

### 2️⃣ Utilisateur clique sur Login

```
User: <click Login>
Frontend (OIDCManager.ts):
  ✓ Appelle userManager.signinRedirect()
Browser:
  ✓ Redirige vers Authentik:
    GET http://localhost:9000/application/o/maisonnettev2/authorize?
      client_id=maisonnettev2&
      response_type=code&
      scope=openid+profile+email&
      redirect_uri=http://localhost:5173/callback&
      state=<random>&
      code_challenge=<PKCE>&
      code_challenge_method=S256
```

### 3️⃣ Authentik affiche le formulaire de connexion

```
Authentik:
  ✓ Valide le client_id, redirect_uri, PKCE
  ✓ Affiche un formulaire de login (email/password, Google, GitHub)
  
User: Entre email + password (ou clique Google/GitHub OAuth)

Authentik:
  ✓ Vérifie les credentials
  ✓ Crée une session utilisateur
  ✓ Génère un authorization code (ex: "abc123")
```

### 4️⃣ Authentik redirige vers le callback avec le code

```
Authentik:
  ✓ Redirige vers:
    GET http://localhost:5173/callback?
      code=abc123&
      state=<same_random>
```

### 5️⃣ Frontend traite le callback

```
Frontend (Callback.tsx):
  ✓ Page monte
  ✓ Appelle handleCallback()
  
oidc-client-ts (OIDCManager.ts):
  ✓ Valide le state (protection CSRF)
  ✓ Extrait le code
  ✓ Échange le code contre un token:
    POST http://localhost:9000/application/o/maisonnettev2/token/
      grant_type=authorization_code&
      code=abc123&
      code_verifier=<PKCE>&
      client_id=maisonnettev2&
      redirect_uri=http://localhost:5173/callback
  
  ✓ Reçoit le token JWT:
    {
      "access_token": "eyJhb...",  (JWT valide 24h)
      "token_type": "Bearer",
      "expires_in": 86400,
      "id_token": "eyJhb...",
      "scope": "openid profile email"
    }
  
  ✓ Décode le JWT (sans valider la signature, juste pour les claims)
  ✓ Stocke en localStorage:
    oidc.user:http://localhost:9000/application/o/maisonnettev2/ = {
      access_token: "eyJhb...",
      id_token: "eyJhb...",
      profile: { sub, email, name, ... }
    }
  
Frontend (Callback.tsx):
  ✓ handleCallback() succès
  ✓ navigate('/', replace: true)
  ✓ Affiche la page d'accueil
```

### 6️⃣ Utilisateur accède à une page protégée

```
Frontend (GiteDetail.tsx):
  const { user, isAuthenticated } = useAuth();
  
  useEffect:
    ✓ getUser() récupère le token depuis localStorage
    ✓ isAuthenticated = true
    ✓ user = { sub: "123...", email: "john@example.com", name: "John" }
  
  ✓ Affiche le contenu protégé
  ✓ useQuery(...) fetch les gîtes:
    GET http://localhost:3001/api/gites
```

### 7️⃣ Frontend fait un appel API protégé

```
Frontend (api.ts - axios interceptor):
  ✓ Avant d'envoyer la requête
  ✓ Appelle getAuthHeaders()
  ✓ await getUser() → récupère le token
  ✓ Ajoute l'header:
    Authorization: Bearer eyJhb...
  
  GET http://localhost:3001/api/reservations
  Headers:
    Authorization: Bearer eyJhb...
```

### 8️⃣ Backend valide le token

```
Backend (Express):
  ✓ Reçoit la requête GET /api/reservations
  ✓ Middleware verifyOIDCToken s'exécute
  
Middleware (oidc.ts):
  ✓ Extrait le Bearer token depuis Authorization header
  ✓ Appelle jwtVerify(token, JWKS)
  
  JWKS Validation:
    ✓ HTTP GET http://localhost:9000/application/o/maisonnettev2/jwks/
    ✓ Récupère les clés publiques d'Authentik (RSA, ECDSA, etc.)
    ✓ Valide la signature du JWT
    ✓ Valide l'expiration (iat + exp)
    ✓ Valide le issuer (iss claim = Authentik)
  
  ✓ Token valide! Décode les claims:
    {
      sub: "123-456-789",
      email: "john@example.com",
      name: "John Doe",
      iat: 1703000000,
      exp: 1703086400,
      iss: "http://localhost:9000/application/o/maisonnettev2/"
    }
  
  ✓ Attache à req.user = {...decoded claims}
  ✓ Passe au next middleware/route handler
```

### 9️⃣ Route exécute la logique métier

```
Backend (reservations.ts):
  router.get('/', verifyOIDCToken, async (req, res) => {
    ✓ req.user.sub = "123-456-789"
    ✓ req.user.email = "john@example.com"
    
    ✓ SELECT * FROM Reservation WHERE clientEmail = ?
    ✓ Récupère les réservations
    ✓ res.json(reservations) → 200
  });
```

### 🔟 Frontend reçoit les données

```
Frontend (GiteDetail.tsx):
  ✓ Requête succès (200)
  ✓ useQuery retourne les données
  ✓ Composant re-render avec les réservations
  ✓ Affiche: "Vos réservations: [...]"
```

## Scenario: Token Expiration

```
Heure T: Token créé, expires_in = 86400s (24h)
Heure T + 24h - 5min (79900s): Auto-renew silencieux

oidc-client-ts détecte l'expiration imminente:
  ✓ Ouvre un iframe invisible
  ✓ Load http://localhost:5173/silent-renew.html
  ✓ silent-renew.html appelle userManager.signinSilentCallback()
  ✓ Requête silencieuse vers Authentik:
    POST http://localhost:9000/application/o/maisonnettev2/token/
      grant_type=refresh_token&
      refresh_token=xyz...&
      client_id=maisonnettev2
  ✓ Reçoit un nouveau access_token
  ✓ Stocke en localStorage
  ✓ L'utilisateur n'a pas vu la redirection
```

## Scenario: Invalid Token (Hacked/Expired)

```
Frontend envoie:
  GET /api/reservations
  Authorization: Bearer <invalid_token>

Backend:
  ✓ Middleware verifyOIDCToken
  ✓ Essaie de valider la signature
  ✗ Signature invalide (clé ne correspond pas)
  ✓ Catch l'erreur: "Invalid token"
  ✓ res.status(401).json({ error: "Invalid token" })

Frontend:
  ✓ Requête échoue avec 401
  ✓ Axios interceptor détecte 401
  ✓ log: "[API] 401 Unauthorized"
  ✓ Optionnel: rediriger vers /login
```

## Scenario: User Logs Out

```
User: <click Logout>

Frontend (OIDCManager.ts):
  ✓ Appelle userManager.signoutRedirect()
  
Browser:
  ✓ Redirige vers:
    GET http://localhost:9000/application/o/maisonnettev2/logout?
      id_token_hint=<id_token>&
      post_logout_redirect_uri=http://localhost:5173
  
Authentik:
  ✓ Valide le id_token_hint
  ✓ Détruit la session utilisateur
  ✓ Redirige vers http://localhost:5173
  
Frontend:
  ✓ userManager.events.addUserUnloaded()
  ✓ localStorage.clear() (tokens supprimés)
  ✓ useAuth() retourne: { user: null, isAuthenticated: false }
  ✓ Affiche: <Login>
```

## Summary

| Étape | Système | Action | Résultat |
|-------|---------|--------|---------|
| 1 | Frontend | Charge la page | localStorage vide → pas d'auth |
| 2 | Frontend | Clic Login | Redirige vers Authentik |
| 3 | Authentik | Login user | Génère authorization code |
| 4 | Authentik | Redirige | `/callback?code=...` |
| 5 | Frontend | Callback | Échange code → access_token |
| 6 | Frontend | Sauvegarde | localStorage + re-render |
| 7 | Frontend | Appel API | Ajoute Authorization header |
| 8 | Backend | Valide token | JWKS check, signature OK |
| 9 | Backend | Exécute route | req.user attaché |
| 10 | Frontend | Reçoit données | Affiche les résultats |

## Debugging Checklist

- [ ] Authentik accessibles sur `http://localhost:9000`
- [ ] Application `maisonnettev2` existe dans Authentik admin UI
- [ ] JWKS endpoint accessible: `curl http://localhost:9000/application/o/maisonnettev2/jwks/`
- [ ] Frontend `.env.development` configuré avec authority + client_id
- [ ] Backend `.env` a `KEYCLOAK_REALM_URL` configuré
- [ ] Frontend affiche le bouton Login (pas d'erreur console)
- [ ] Clic Login redirige vers Authentik (pas d'erreur 400)
- [ ] Après login, localStorage contient `oidc.user:...`
- [ ] Appel API protégé inclut le Bearer token (network tab)
- [ ] Backend retourne 200 (pas 401)
