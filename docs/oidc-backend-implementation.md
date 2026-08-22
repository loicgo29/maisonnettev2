# OIDC Backend Implementation — maisonnettev2

Cette doc couvre l'implémentation OIDC côté backend (Node.js/Express + Jose).

## Fichiers créés

### `src/middleware/oidc.ts`
- Middleware `verifyOIDCToken` pour validation des JWT
- Utilise `jose` + `createRemoteJWKSet()` pour valider via Authentik JWKS
- Décode le token et attache l'utilisateur à `req.user`
- Récupère la JWKS à distance (HTTP GET `/jwks/`) depuis Authentik
- Cache la JWKS en mémoire pour éviter les requêtes répétées

### `src/routes/reservations.ts`
- Route `GET /api/reservations` (listée les réservations de l'utilisateur)
- Route `POST /api/reservations` (créer une réservation)
- Route `GET /api/reservations/:id` (détails d'une réservation)
- Toutes protégées par `verifyOIDCToken`
- Validation des données avec Zod
- Vérification de la disponibilité des dates

### `src/swagger.ts` (mis à jour)
- Schéma `securitySchemes` pour Bearer Auth
- Définition des modèles Swagger (Gite, Photo, Reservation)
- À étendre avec les routes JSDoc

## Configuration Environment

Backend `.env`:

```
# Authentik OIDC
KEYCLOAK_REALM_URL=http://localhost:9000/application/o/maisonnettev2/
```

La JWKS URL est automatiquement construite comme `${KEYCLOAK_REALM_URL}jwks/`

## Flow d'authentification

1. **Frontend** envoie une requête protégée:
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3001/api/reservations
   ```

2. **Backend** reçoit la requête
   - Middleware `verifyOIDCToken` intercept
   - Extrait le Bearer token de l'Authorization header
   - Vérifie la signature via JWKS Authentik (reqête HTTP GET)

3. **Validation réussie**
   - Token décodé est attaché à `req.user`
   - Le reste du middleware/route a accès à `req.user.sub`, `req.user.email`, etc.
   - Réponse 200 avec les données

4. **Validation échouée**
   - Réponse 401 avec `{ error: 'Invalid token' }`
   - Aucune donnée sensible n'est retournée

## Utilisation dans les routes

### Route protégée simple

```typescript
import { verifyOIDCToken, AuthRequest } from '../middleware/oidc';

router.get('/protected', verifyOIDCToken, async (req: AuthRequest, res) => {
  // req.user est garanti d'être défini et valide
  const userId = req.user.sub;
  const userEmail = req.user.email;
  
  // Récupérer les données de l'utilisateur
  res.json({ message: 'Hello ' + userEmail });
});
```

### Vérifier les données utilisateur

```typescript
interface AuthRequest extends Request {
  user?: {
    sub: string;              // Authentik user ID
    email?: string;            // Email address
    name?: string;             // Full name
    email_verified?: boolean;  // Email verification status
    [key: string]: any;        // Other claims from Authentik
  };
}

// Dans une route protégée:
const sub = req.user?.sub;        // "12345-67890-abcde"
const email = req.user?.email;    // "user@example.com"
const name = req.user?.name;      // "John Doe"
```

## Débogage

### Vérifier la JWKS distance

```bash
curl http://localhost:9000/application/o/maisonnettev2/jwks/ | jq
# Réponse:
# {
#   "keys": [
#     {
#       "kty": "RSA",
#       "kid": "...",
#       "use": "sig",
#       "n": "...",
#       "e": "AQAB"
#     }
#   ]
# }
```

### Décoder un token (JWT.io)

```bash
# Frontend: récupérer le token depuis localStorage
const user = JSON.parse(localStorage.getItem('oidc.user:...'));
console.log(user.access_token);

# Copier le token sur https://jwt.io
# Vérifier:
# - Signature valide (clé publique d'Authentik)
# - Claims: sub, email, iat, exp
# - Expiration: exp > current timestamp
```

### Logs

```typescript
// Ajouter du logging pour déboguer
console.log(`[OIDC] Token verification failed: ${err.message}`);

// Backend logs:
docker-compose logs backend | grep OIDC
```

## Sécurité

- ✅ Token validé via clé publique (pas de secret partagé)
- ✅ Signature RSA vérifiée
- ✅ Expiration (exp claim) vérifiée automatiquement par jose
- ✅ Pas de token stocké en DB (stateless)
- ✅ CORS restreint à l'origine frontend
- ✅ HTTP-only cookies optionnel (plus tard si besoin)

## Production

- HTTPS obligatoire
- JWKS URL doit être accessible depuis le VPS backend
- Token expiration: 24h par défaut (configurable dans blueprint Authentik)
- JWKS en cache: ttl par défaut = 60 secondes (Jose gère)

## Prochaines étapes

1. Tester les routes protégées avec un token valide
2. Implémenter Stripe webhook (sans protéger par OIDC, car webhook signé par Stripe)
3. Implémenter Google Calendar sync
4. Ajouter des roles/permissions dans Authentik si besoin d'RBAC fin

## Ressources

- [Authentik OIDC endpoints](http://localhost:9000/application/o/maisonnettev2/.well-known/openid-configuration)
- [Jose library](https://github.com/panva/jose)
- [JWT claims](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
