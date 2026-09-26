# Quickstart Test OAuth2 Local

## ✅ Code ready — Reste à faire

La branche `feat/admin-oauth2-keycloak` a été **mergée** dans main. Le code est prêt en local et en production.

**Avant de déployer :** Tester localement en se branchant sur le Keycloak de production.

---

## 🧪 Test Local (5 minutes)

### 1. Créer les clients dans Keycloak

Accédez à : `https://auth.maisonnette-pecheur-bertheaume.fr/admin/`

**Créer deux clients OIDC :**

#### Client `oauth2-proxy-local` (test)
- **Client ID:** `oauth2-proxy-local`
- **Valid redirect URIs:** `http://localhost:8030/oauth2/callback`
- **Valid post logout redirect URIs:** `http://localhost:8030`
- **Web origins:** `localhost:8030`

#### Client `oauth2-proxy` (production)
- **Client ID:** `oauth2-proxy`
- **Valid redirect URIs:** `https://maisonnette-pecheur-bertheaume.fr/oauth2/callback`
- **Valid post logout redirect URIs:** `https://maisonnette-pecheur-bertheaume.fr`
- **Web origins:** `https://maisonnette-pecheur-bertheaume.fr`

**Copier les Client Secrets** pour chaque client (onglet Credentials).

### 2. Créer `.env.oauth2-local`

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

cat > .env.oauth2-local << 'EOF'
OAUTH2_CLIENT_ID=oauth2-proxy-local
OAUTH2_CLIENT_SECRET=<copier-depuis-keycloak-credentials>
OAUTH2_COOKIE_SECRET=<générer-avec-openssl-rand-hex-32>
EOF
```

**Générer le cookie secret :**
```bash
openssl rand -hex 32
```

### 3. Charger et lancer

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2

# Charger les secrets
export $(cat .env.oauth2-local | xargs)

# Arrêter les anciens containers (optionnel)
docker-compose down

# Lancer le stack avec oauth2-proxy
docker-compose up -d

# Vérifier que tout démarre
docker-compose logs -f oauth2-proxy
```

### 4. Tester l'authentification

**Essayer d'accéder à :**
```
http://localhost:8030/admin/alo
```

**Attendu :**
1. Redirige vers `https://auth.maisonnette-pecheur-bertheaume.fr/login`
2. Vous identifiez avec vos credentials Keycloak
3. Redirige vers `http://localhost:8030/admin/alo` (maintenant accessible)

**Tester les autres routes :**
- `http://localhost:8030/admin` (backoffice)
- `http://localhost:8030/admin/comptabilite` (relance)

**Routes publiques (sans auth) :**
- `http://localhost:8030/` (homepage)
- `http://localhost:8030/api/*` (API — pas protégée)

---

## 🐛 Troubleshooting Local

| Erreur | Fix |
|--------|-----|
| `oauth2-proxy: container not found` | `docker-compose up -d` relance le stack |
| `redirect_uri_mismatch` | Vérifier le client Keycloak : la redirect URI doit être exactement `http://localhost:8030/oauth2/callback` |
| `invalid_client_secret` | Vérifier que le secret dans `.env.oauth2-local` correspond à celui de Keycloak |
| Connexion infinie de redirige | Vérifier les logs : `docker-compose logs oauth2-proxy` |
| `curl: command not found` (sur oauth2-proxy) | Normal, le container n'a pas curl — utiliser le healthcheck Caddy |

---

## 🚀 Après Test Local OK

### Ajouter à Bitwarden

Créer l'élément `maisonnettev2-oauth2-proxy` avec :
```
OAUTH2_CLIENT_ID = oauth2-proxy
OAUTH2_CLIENT_SECRET = <depuis-keycloak>
OAUTH2_COOKIE_SECRET = <openssl-rand-hex-32>
```

### Charger en Production

```bash
ssh hetzner

cd /opt/maisonnettev2

# Charger les secrets depuis Bitwarden
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Vérifier que oauth2-proxy démarre
docker-compose logs -f oauth2-proxy
```

### Tester en Production

```
https://maisonnette-pecheur-bertheaume.fr/admin/alo
```

**Attendu :** Redirige vers Keycloak, après auth accès à `/admin/alo`.

---

## ✅ Checklist

### Avant de tester localement
- [ ] Créer client `oauth2-proxy-local` dans Keycloak
- [ ] Copier le Client Secret
- [ ] Créer `.env.oauth2-local` avec les 3 secrets
- [ ] `docker-compose up -d`

### Pendant le test local
- [ ] Accès à `/admin/alo` redirige vers Keycloak ✅
- [ ] Après login, accès à `/admin/alo` ✅
- [ ] Accès à `/admin` et `/admin/comptabilite` aussi protégé ✅
- [ ] Routes publiques (`/`, `/api/*`) accessible sans auth ✅

### Avant de déployer en prod
- [ ] Créer client `oauth2-proxy` dans Keycloak
- [ ] Copier le Client Secret
- [ ] Ajouter à Bitwarden `maisonnettev2-oauth2-proxy`
- [ ] `setup-env.sh --prod` charge les secrets
- [ ] Redéployer : `docker-compose -f docker-compose.prod.yml restart oauth2-proxy caddy`

---

**Questions ?** Voir `OAUTH2_LOCAL_TEST.md` ou `CREATE_OAUTH2_CLIENT_STEPS.md` pour plus de détails.
