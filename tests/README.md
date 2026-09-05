# BDD Tests — Local vs Production

Deux suites de tests BDD complètes et indépendantes :

## 🏠 Tests Local (Mac Mini)

Testent l'environnement de développement local.

### Prérequis
```bash
# Démarrer les containers de développement
docker-compose -f docker-compose.test.yml up -d

# Vérifier que tout tourne
docker ps | grep maisonnette-test-
```

### Lancer les tests
```bash
# Via script
./scripts/test-local.sh

# Ou directement
TEST_ENV=local npx cucumber-js tests/features/local-services.feature \
  --require tests/steps/local-services.steps.js
```

### Ce qui est testé
✅ Tous les containers Docker tournent (frontend, backend, DB, Keycloak)  
✅ Frontend accessible sur http://localhost:5173  
✅ Backend API accessible sur http://localhost:3001  
✅ Keycloak accessible sur http://localhost:9000  
✅ Aucun container en état "restarting"

### Logs
```bash
docker-compose -f docker-compose.test.yml logs -f backend
```

---

## 🚀 Tests Production (Hetzner)

Testent le déploiement production sur Hetzner.

### Prérequis

1. **SSH key configurée**
```bash
# La clé doit exister
ls -la ~/.ssh/maisonnettev2_hetzner

# Si manquante, créer :
ssh-keygen -t ed25519 -C "maisonnettev2-hetzner" \
  -f ~/.ssh/maisonnettev2_hetzner
```

2. **Connectivité Hetzner vérifiée**
```bash
ssh -i ~/.ssh/maisonnettev2_hetzner deploy@23.88.35.119 'docker ps'
```

3. **Variables d'env (optionnel)**
```bash
export SSH_HOST=23.88.35.119
export SSH_USER=deploy
export SSH_KEY=~/.ssh/maisonnettev2_hetzner
```

### Lancer les tests
```bash
# Via script (recommandé)
./scripts/test-production.sh

# Ou directement
TEST_ENV=production npx cucumber-js tests/features/production-deployment.feature \
  --require tests/steps/production-services.steps.js
```

### Ce qui est testé
✅ Frontend HTTPS accessible (maisonnette-pecheur-bertheaume.fr)  
✅ Backend API accessible  
✅ Keycloak realm maisonnettev2 configuré  
✅ Base PostgreSQL connectée  
✅ Tous les containers Hetzner tournent (via SSH)  
✅ Admin dashboard accessible  
✅ API documentation (Swagger) disponible

### SSH en cas de problème
```bash
# Se connecter directement
ssh -i ~/.ssh/maisonnettev2_hetzner deploy@23.88.35.119

# Vérifier les services
cd /opt/maisonnettev2
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml ps
docker compose logs -f backend
```

---

## 🔄 Workflow complet

### Avant de commiter
```bash
# 1. Tests locaux (doit être vert)
npm run test:bdd:local

# 2. Push le code
git push

# 3. CI GitHub Actions tourne (vérifie local + unit tests)
```

### Avant de déployer
```bash
# 1. Tests local OK
npm run test:bdd:local

# 2. Déployer via Ansible/terraform
cd NAS-LOGO
ansible-playbook deploy.yml --tags maisonnettev2

# 3. Tests production (vérifie Hetzner)
npm run test:bdd:prod
```

---

## 📋 Configuration d'env (tests/env.js)

Chaque environment a sa propre configuration :

### Local
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Keycloak: http://localhost:9000
- Docker: ✓ Disponible
- SSH: ✗ Non utilisé

### Production
- Frontend: https://maisonnette-pecheur-bertheaume.fr
- Backend: https://maisonnette-pecheur-bertheaume.fr/api
- Keycloak: https://auth.maisonnette-pecheur-bertheaume.fr
- Docker: ✗ Non disponible
- SSH: ✓ Vérifie les containers via SSH

---

## 🆘 Troubleshooting

### SSH timeout
```bash
# Augmenter le timeout
timeout 30 ssh -i ~/.ssh/maisonnettev2_hetzner deploy@23.88.35.119 'docker ps'
```

### Keycloak realm not found
```bash
# Vérifier que le realm existe (en prod)
ssh deploy@23.88.35.119 'cd /opt/maisonnettev2 && \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U keycloak -d keycloak -c "SELECT realm FROM realm WHERE name='"'"'maisonnettev2'"'"';"'
```

### Database connection issues
```bash
# Test local DB
psql -h localhost -U maisonnettev2 -d maisonnettev2 -c "SELECT 1"

# Test prod DB via SSH
ssh deploy@23.88.35.119 'cd /opt/maisonnettev2 && \
  docker compose exec -T postgres pg_isready'
```

---

## 📊 Résumé des tests

| Suite | Env | Type | Containers | HTTP | SSH |
|-------|-----|------|-----------|------|-----|
| @local | Mac Mini | Docker | ✓ | ✓ | ✗ |
| @production | Hetzner | HTTPS | ✓ SSH | ✓ | ✓ |

Commandes npm (ajouter à package.json) :
```json
"test:bdd:local": "TEST_ENV=local npx cucumber-js tests/features/local-services.feature",
"test:bdd:prod": "TEST_ENV=production npx cucumber-js tests/features/production-deployment.feature",
"test:bdd": "npm run test:bdd:local"
```
