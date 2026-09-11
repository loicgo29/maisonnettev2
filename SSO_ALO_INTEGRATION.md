# 🔗 Intégration SSO : maisonnettev2 → ALO

Le dashboard admin maisonnettev2 intègre un lien vers ALO avec **Single Sign-On automatique**.

Lorsqu'un utilisateur authentifié sur maisonnettev2 clique sur "Comptes ALO", il accède automatiquement à ALO sans se reconnecter.

## Comment ça marche

### 1. Authentification maisonnettev2

L'utilisateur se connecte via Keycloak sur maisonnettev2 :
```
POST /api/backoffice/auth/login  →  Keycloak (OAuth2/OIDC PKCE)
↓
Reçoit un JWT (access_token)
↓
Stocke en sessionStorage (admin_jeton_acces)
```

### 2. Lien SSO vers ALO

Dans le dashboard admin (`/admin`), le lien "Comptes ALO" est construit dynamiquement :

```typescript
// frontend/src/routes/admin/+page.svelte
function buildAloLink(): string {
  const token = jeton();  // Récupère le JWT depuis sessionStorage
  if (!token) return 'https://alo.maisonnette-pecheur-bertheaume.fr/';
  return `https://alo.maisonnette-pecheur-bertheaume.fr/login?token=${encodeURIComponent(token)}`;
}
```

**URL générée :**
```
https://alo.maisonnette-pecheur-bertheaume.fr/login?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. ALO valide et crée une session

ALO reçoit le JWT et le valide :
```
GET /login?token=<JWT>
  ↓
ALO valide le JWT contre la clé publique Keycloak
  ↓
ALO extrait username, email, user_id
  ↓
ALO crée un cookie de session (alo_user, alo_token)
  ↓
Redirection vers /  (accueil ALO)
```

### 4. Utilisateur connecté à ALO

L'utilisateur voit le dashboard ALO **sans re-saisir ses identifiants**.

Les requêtes API suivantes incluent le JWT :
```javascript
Authorization: Bearer <JWT>
```

## Configuration

### Frontend (maisonnettev2)

**Fichier :** `frontend/src/routes/admin/+page.svelte`

```svelte
<script lang="ts">
  import { jeton } from '$lib/auth';

  function buildAloLink(): string {
    const token = jeton();
    if (!token) return 'https://alo.maisonnette-pecheur-bertheaume.fr/';
    return `https://alo.maisonnette-pecheur-bertheaume.fr/login?token=${encodeURIComponent(token)}`;
  }
</script>

<a href={buildAloLink()} class="link-card">
  <div class="icon">💶</div>
  <h3>Comptes ALO</h3>
  <p>Gérer les comptes et la comptabilité</p>
</a>
```

### Backend (ALO)

**Fichier :** `app/app/config.py`

```python
KEYCLOAK_URL: str = "http://localhost:9001"      # Dev
KEYCLOAK_URL: str = "https://auth.maisonnette..."  # Prod
KEYCLOAK_REALM: str = "maisonnettev2"
```

## URLs en production

### Maisonnettev2
- Frontend : `https://maisonnette-pecheur-bertheaume.fr`
- Admin dashboard : `https://maisonnette-pecheur-bertheaume.fr/admin`

### ALO
- Frontend : `https://alo.maisonnette-pecheur-bertheaume.fr`
- Login SSO : `https://alo.maisonnette-pecheur-bertheaume.fr/login?token=...`
- API : `https://alo.maisonnette-pecheur-bertheaume.fr/api`

### Keycloak (IDP)
- Dev : `http://localhost:9001` (Mac mini)
- Prod : `https://auth.maisonnette-pecheur-bertheaume.fr`

## Sécurité

### ✅ Points forts

- **JWT validé cryptographiquement** : impossible à contrefaire
- **HTTPS en production** : chiffrement en transit
- **Token court-vie** : expires après 5-15 minutes
- **Pas de credentials stockées** : seul le JWT transmis
- **Cookie HttpOnly** : protection contre XSS
- **SameSite=Strict** : protection contre CSRF

### ⚠️ Points à surveiller

1. **Token en URL** : visible dans l'historique du navigateur
   - Mitigé par HTTPS
   - Future amélioration : POST avec body

2. **Expiry** : utilisateur doit se re-connecter après expiration du token
   - Gestion future : refresh token

## Tests

### Flux complet en développement

```bash
# 1. Démarrer les services
cd /Volumes/logousb/SSD/Projects/maisonnettev2
docker-compose -f docker-compose.prod.yml up -d  # Keycloak, PostgreSQL

cd /Volumes/logousb/SSD/Projects/alo/app
uv run uvicorn app.main:app --reload

# 2. Ouvrir le navigateur
# http://localhost:5173/admin

# 3. Se connecter
# Username: logo-back
# Password: (votre mot de passe Keycloak)

# 4. Cliquer sur "Comptes ALO"
# Attendu: Redirection automatique vers ALO

# 5. Vérifier les cookies
# DevTools → Application → Cookies
# - alo_user = logo-back
# - alo_token = <JWT>
```

### Vérifier le token en URL

```javascript
// Console du navigateur
const url = new URL(location.href);
const token = url.searchParams.get('token');
console.log('Token reçu:', token);
```

### Vérifier la validation ALO

```bash
# Récupère un token valide depuis la DevTools (sessionStorage)
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Appelle l'endpoint de validation ALO
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/auth/me

# Attendu:
# {
#   "user_id": "...",
#   "username": "logo-back",
#   "email": "loic@logo-solutions.fr"
# }
```

## Troubleshooting

### ❌ Lien ALO pas construit (pas de ?token=)

**Cause :** Pas de JWT stocké en sessionStorage  
**Solutions :**
1. Vérifier que vous êtes authentifié : vérifier le header du dashboard
2. Ouvrir la console DevTools : `sessionStorage.getItem('admin_jeton_acces')`
3. Redémarrer la page `/admin` pour forcer la ré-authentification

### ❌ Erreur "Token validation failed" sur ALO

**Cause :** Token invalide ou Keycloak inaccessible  
**Solutions :**
1. Vérifier que Keycloak est démarré
2. Vérifier que KEYCLOAK_URL dans ALO .env pointe vers le bon endroit
3. Vérifier les logs ALO : `docker logs alo-backend`

### ❌ Pas de redirection vers ALO

**Cause :** Lien construit sans token  
**Solutions :**
1. DevTools → Network → chercher la requête vers /login
2. Vérifier que l'URL contient bien `?token=...`
3. Vérifier la console pour les erreurs JavaScript

### ❌ Connecté à ALO mais pas accès à l'API

**Cause :** Token expiré ou pas inclus dans les requêtes  
**Solutions :**
1. Vérifier le token dans DevTools → Application → Cookies → alo_token
2. Vérifier les headers des requêtes API (DevTools → Network)
3. Tester directement : `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/expenses`

## Améliorations futures

1. **Afficher l'utilisateur dans ALO**
   - Inclure le nom/email dans le header ALO
   - Bouton "Déconnexion" qui redirige vers maisonnettev2

2. **Refresh token**
   - Implémenter la rotation automatique du token
   - Éviter la déconnexion en cas d'expiry

3. **POST au lieu de query param**
   - Plus sécurisé (token pas visible dans l'URL)
   - Requerrait un formulaire hidden avec redirection POST

4. **Audit et logging**
   - Logger les connexions SSO (qui, quand, depuis où)
   - Détecter les accès anormaux

## Fichiers pertinents

- **maisonnettev2 auth :** `frontend/src/lib/auth.ts` (gestion JWT)
- **maisonnettev2 admin :** `frontend/src/routes/admin/+page.svelte` (lien ALO)
- **ALO auth service :** `app/app/services/keycloak_auth.py` (validation JWT)
- **ALO middleware :** `app/app/middleware/auth.py` (protection routes)
- **ALO routes :** `app/app/routers/auth.py` (endpoint /login)

## Références

- Voir [SSO_KEYCLOAK.md](../alo/app/SSO_KEYCLOAK.md) pour les détails techniques ALO
- Voir [CLAUDE.md](./CLAUDE.md) pour l'architecture maisonnettev2

---

**Développé avec Claude Code – Anthropic**  
Session: https://claude.ai/code/session_01Sa7K26ALYPcQr96dGzWZWj
