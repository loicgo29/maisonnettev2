# Créer le client OAuth2-Proxy dans Keycloak

**Deux clients à créer :**
1. `oauth2-proxy-local` — pour tester en local
2. `oauth2-proxy` — pour la production

---

## 🖥️ Via Interface Web (Facile)

### Accès à Keycloak Admin

```
https://auth.maisonnette-pecheur-bertheaume.fr/admin/
```

**Credentials:**
- Username: `admin`
- Password: (voir Bitwarden — élément `maisonnettev2-keycloak`)

### Créer le client `oauth2-proxy-local` (Test)

1. **Sidebar → Clients → Create client**
   - **Client ID:** `oauth2-proxy-local`
   - **Client type:** OpenID Connect
   - **Next**

2. **Onglet "Settings" (il s'ouvre après création)**
   - **Valid redirect URIs:**
     ```
     http://localhost:8030/oauth2/callback
     ```
   - **Valid post logout redirect URIs:**
     ```
     http://localhost:8030
     ```
   - **Web origins:**
     ```
     localhost:8030
     ```
   - **Capabilities** → Activer `Standard flow`
   - **Save**

3. **Onglet "Credentials"**
   - Copier le **Client Secret**
   - Conserver pour `.env.oauth2-local`

### Créer le client `oauth2-proxy` (Production)

**Même procédure, mais :**
- **Client ID:** `oauth2-proxy`
- **Valid redirect URIs:**
  ```
  https://maisonnette-pecheur-bertheaume.fr/oauth2/callback
  ```
- **Valid post logout redirect URIs:**
  ```
  https://maisonnette-pecheur-bertheaume.fr
  ```
- **Web origins:**
  ```
  https://maisonnette-pecheur-bertheaume.fr
  ```

---

## 🧪 Pour Tester en Local

### 1. Créer le client `oauth2-proxy-local` (ci-dessus)

### 2. Créer `.env.oauth2-local`

```bash
cat > /Volumes/logousb/SSD/Projects/maisonnettev2/.env.oauth2-local << 'EOF'
OAUTH2_CLIENT_ID=oauth2-proxy-local
OAUTH2_CLIENT_SECRET=<copier-depuis-keycloak>
OAUTH2_COOKIE_SECRET=$(openssl rand -hex 32)

# Keycloak en production (pas local)
OIDC_ISSUER_URL=https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2
EOF
```

### 3. Charger les secrets et lancer

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2
export $(cat .env.oauth2-local | xargs)

# Lancer le docker-compose local (qui inclut oauth2-proxy)
docker-compose up -d

# Vérifier les logs
docker-compose logs -f oauth2-proxy
```

### 4. Tester

- **Naviguer vers :** `http://localhost:8030/admin/alo`
- **Attendu :** Redirige vers `https://auth.maisonnette-pecheur-bertheaume.fr/login`
- **Après login :** Accès à `/admin/alo`

---

## 🚀 Pour Production

### 1. Créer le client `oauth2-proxy` (ci-dessus)

### 2. Ajouter les secrets à Bitwarden

Créer/mettre à jour l'élément Bitwarden `maisonnettev2-oauth2-proxy`:
- **username:** `OAUTH2_CLIENT_ID` → valeur: `oauth2-proxy`
- **password:** `OAUTH2_CLIENT_SECRET` → valeur: (depuis Keycloak)
- **Notes:** Ajouter la ligne: `OAUTH2_COOKIE_SECRET=<généré>`

Générer le cookie secret:
```bash
openssl rand -hex 32
```

### 3. Charger en production

```bash
cd /Volumes/logousb/SSD/Projects
./scriptslogo/setup/setup-env.sh --prod
```

Cela charge automatiquement les 3 secrets dans `.env.production`.

### 4. Redéployer

```bash
ssh hetzner
cd /opt/maisonnettev2
docker-compose -f docker-compose.prod.yml restart oauth2-proxy caddy

# Vérifier
docker-compose logs -f oauth2-proxy
```

### 5. Tester

- **Naviguer vers :** `https://maisonnette-pecheur-bertheaume.fr/admin/alo`
- **Attendu :** Redirige vers Keycloak
- **Après login :** Accès à `/admin/alo`, `/admin`, `/admin/comptabilite`

---

## ✅ Checklist avant déploiement

- [ ] Client `oauth2-proxy-local` créé dans Keycloak
- [ ] Client `oauth2-proxy` créé dans Keycloak
- [ ] Secrets chargés localement dans `.env.oauth2-local`
- [ ] Test local OK (accès à `/admin/alo`)
- [ ] Secrets ajoutés à Bitwarden (`maisonnettev2-oauth2-proxy`)
- [ ] Secrets chargés en prod via `setup-env.sh --prod`
- [ ] Redéploiement OK en prod
- [ ] Routes `/admin*` demandent authentification

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| `redirect_uri_mismatch` | Vérifier que la redirect URI dans Keycloak correspond exactement (inclure `http://` ou `https://`) |
| `invalid_client_secret` | Régénérer le secret dans Keycloak → Onglet "Credentials" |
| `oauth2-proxy ne démarre pas` | `docker-compose logs oauth2-proxy` pour voir l'erreur exacte |
| Loop infini de redirects | Vérifier que `cookie-secure=false` en local (déjà dans docker-compose.yml) |
