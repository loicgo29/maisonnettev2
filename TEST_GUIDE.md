# Comprehensive Test Suite — maisonnettev2

Guide complet des tests automatisés pour l'écosystème maisonnettev2 + Authentik.

## Vue d'ensemble

La suite de tests couvre :
- **Tests unitaires** (backend + frontend)
- **Tests E2E** (Playwright multi-navigateur)
- **Tests BDD** (Cucumber scenarios en français)
- **Tests d'intégration API** (vérification des contrats)
- **Audits de sécurité** (npm audit, linting, type-checking)

## Structure

```
maisonnettev2/
├── backend/
│   ├── tests/
│   │   └── unit/
│   │       ├── health.test.ts
│   │       ├── gites.test.ts
│   │       └── reservations.test.ts
│   ├── features/
│   │   └── authentication.feature         # Scénarios Cucumber
│   └── features/step_definitions/
│       └── authentication.steps.ts        # Implémentation des étapes
├── frontend/
│   ├── tests/
│   │   └── e2e/
│   │       └── auth-flow.spec.ts          # Tests Playwright
│   └── playwright.config.ts
└── test-suite.sh                          # Orchestrateur principal
```

## Quick Start

### 1. Lancer tous les tests

```bash
cd maisonnettev2
./test-suite.sh
```

Cela exécutera :
- Tests unitaires backend
- Tests E2E frontend (si services sont running)
- Scénarios BDD
- Tests d'intégration API
- Audits de sécurité

### 2. Lancer les tests du backend uniquement

```bash
cd backend
npm run test:unit        # Tests unitaires
npm run test:bdd         # Scénarios Cucumber
npm run lint             # Linting ESLint
npm run typecheck        # TypeScript strict
npm audit                # Audit de sécurité
```

### 3. Lancer les tests du frontend uniquement

```bash
cd frontend
npm run test:e2e         # Tests Playwright
npm run typecheck        # TypeScript strict
npm run lint             # Linting ESLint
npm audit                # Audit de sécurité
```

## Tests Unitaires Backend

### Configuration

- **Framework** : Vitest
- **Environnement** : jsdom
- **Mocking** : vi (Vitest mocks)
- **Location** : `backend/tests/unit/**/*.test.ts`

### Fichiers de test

#### `health.test.ts`
- Vérifie `/health` retourne 200 avec DB connectée
- Vérifie `/health` retourne 503 si DB inaccessible
- Teste `/live` (liveness probe sans vérification DB)
- Teste `/ready` (readiness probe avec vérification DB)

#### `gites.test.ts`
- Teste `GET /api/gites` (public, retourne liste)
- Teste `GET /api/gites/:slug` (public, retourne gîte)
- Teste `POST /api/gites` (protégé, crée gîte)
- Validation des champs requis (Zod)
- Gestion des erreurs DB

#### `reservations.test.ts`
- Teste `GET /api/reservations` (protégé, authentification requise)
- Teste `GET /api/reservations/:id` (détail)
- Teste `POST /api/reservations` (création)
- Validation des dates (dateDebut < dateFin)
- Détection des conflits de dates
- Validation Zod des entrées

### Exécuter les tests unitaires

```bash
cd backend

# Tous les tests unitaires
npm run test:unit

# Avec couverture
npm run test:unit -- --coverage

# Mode watch (relance automatique)
npm run test:unit -- --watch

# Un test spécifique
npm run test:unit -- health.test.ts
```

## Tests E2E Frontend (Playwright)

### Configuration

- **Framework** : Playwright
- **Navigateurs** : Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Location** : `frontend/tests/e2e/**/*.spec.ts`
- **Rapports** : `test-results/index.html`

### Fichier de test : `auth-flow.spec.ts`

#### Suite 1 : Authentication Flow
- ✅ Frontend charge correctement
- ✅ Bouton login redirige vers Authentik
- ✅ OIDC Manager initialise sans erreur
- ✅ Pas d'erreur console fatale

#### Suite 2 : Backend API
- ✅ `/health` répond (200 ou 503)
- ✅ `/api/docs` (Swagger) accessible
- ✅ `/api/gites` (public) fonctionne
- ✅ `/api/reservations` (protégé) retourne 401 sans auth
- ✅ `/api/reservations` avec JWT valide (200 ou 401)
- ✅ JWKS endpoint accessible
- ✅ Configuration OIDC découverte

#### Suite 3 : Integration Checks
- ✅ Frontend peut atteindre le backend
- ✅ Backend peut atteindre JWKS d'Authentik
- ✅ Headers CORS configurés correctement
- ✅ Tous les services répondent aux requêtes
- ✅ Pas de boucles de redirection infinies

#### Suite 4 : Security
- ✅ API rejette tokens invalides (401)
- ✅ API rejette requêtes sans Authorization (401)
- ✅ API rejette Authorization malformé
- ✅ Endpoints publics ne requirent pas d'auth
- ✅ Pas de données sensibles dans erreurs
- ✅ Headers de sécurité présents (Helmet.js)

### Exécuter les tests E2E

```bash
cd frontend

# Tous les tests
npm run test:e2e

# Navigateur spécifique
npm run test:e2e -- --project=chromium

# Avec interface graphique
npm run test:e2e -- --ui

# Debug mode
npm run test:e2e -- --debug

# Mode headed (voir le navigateur)
npm run test:e2e -- --headed

# Générer rapport HTML
npm run test:e2e
# Puis ouvrir: test-results/index.html
```

## Tests BDD (Cucumber)

### Configuration

- **Framework** : @cucumber/cucumber
- **Langage** : Gherkin en français
- **Location** : 
  - Features : `backend/features/*.feature`
  - Steps : `backend/features/step_definitions/*.steps.ts`
- **Rapports** : `test-results/cucumber-report.html`

### Fichier : `authentication.feature`

**Scénarios couverts** (en français) :

1. **Admin accède à l'interface d'administration**
   - Navigation vers `/if/admin/`
   - Vérification du titre "Authentik"

2. **Application maisonnettev2 est enregistrée**
   - Vérification de l'existance de l'app OAuth2
   - Redirect URIs correctes
   - Fournisseur OIDC configuré

3. **Sources OAuth2 sont activées**
   - Vérification Google OAuth
   - Vérification GitHub OAuth
   - Email/password configuré

4. **Health checks passent**
   - GET `/-/health/live/` retourne 200
   - Service marqué "healthy"

5. **Utilisateur navigue vers accueil**
   - Page charge sans erreur
   - Voit "Maisonnette v2" ou "Gîte"

6. **Utilisateur clique sur login**
   - Redirigé vers Authentik
   - Page d'authentification affichée

7. **Backend valide JWT**
   - GET `/api/reservations` avec token → 200
   - Sans token → 401

### Exécuter les tests BDD

```bash
cd backend

# Tous les scénarios
npm run test:bdd

# Scénario spécifique
npm run test:bdd -- --tags @critical

# Rapport HTML
npm run test:bdd
# Puis ouvrir: test-results/cucumber-report.html

# Dry run (affiche sans exécuter)
npx cucumber-js --dry-run
```

## Tests d'Intégration API

### Vérifications automatiques

Les tests d'intégration API incluent :

1. **Healthchecks**
   - GET `/health` → 200
   - GET `/live` → 200
   - GET `/ready` → 200

2. **Endpoints publics**
   - GET `/api/gites` → 200, JSON valide
   - GET `/api/gites/:slug` → 200 ou 404

3. **Endpoints protégés**
   - GET `/api/reservations` sans auth → 401
   - GET `/api/reservations` avec JWT → 200/401
   - POST `/api/reservations` → crée réservation

4. **Configuration OIDC**
   - Discovery endpoint `/application/o/maisonnettev2/.well-known/openid-configuration` → 200
   - JWKS endpoint `/application/o/maisonnettev2/jwks/` → 200

5. **Authentik Health**
   - `/-/health/live/` → 200
   - API `/api/v3/` endpoints accessible

### Tests curl manuels

```bash
# Health check
curl -i http://localhost:3001/health

# Swagger docs
curl -i http://localhost:3001/api/docs

# Lister les gîtes (public)
curl -i http://localhost:3001/api/gites

# Lister les réservations (protégé)
curl -i -H "Authorization: Bearer YOUR_JWT" http://localhost:3001/api/reservations

# OIDC discovery
curl -i http://localhost:9000/application/o/maisonnettev2/.well-known/openid-configuration

# JWKS
curl -i http://localhost:9000/application/o/maisonnettev2/jwks/
```

## Audits de Sécurité

### 1. npm audit

Scan des vulnérabilités dans les dépendances.

```bash
# Backend
cd backend
npm audit                           # Rapport console
npm audit --json > audit.json       # JSON pour analyse

# Frontend
cd frontend
npm audit
```

**Niveaux d'audit** :
- `low` : Critique — doit être résolu
- `moderate` : Sérieux — à prioriser
- `high` : Bloquer la release
- `critical` : Incident immédiat

### 2. Linting (ESLint)

Détecte les erreurs de code, style et patterns dangereux.

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

### 3. Type Checking (TypeScript)

Vérification stricte des types.

```bash
cd backend && npm run typecheck
cd frontend && npm run typecheck
```

## Prérequis pour les tests

### Services requis

Pour la suite complète de tests, les services doivent être en cours d'exécution :

```bash
# Terminal 1 : Lancer IDP
cd ../idp
docker-compose up -d

# Terminal 2 : Lancer maisonnettev2
cd ../maisonnettev2
docker-compose up -d

# Terminal 3 : Attendre 15 secondes (stabilisation)
sleep 15

# Terminal 4 : Lancer les tests
./test-suite.sh
```

### Alternatives

Si les services ne sont pas disponibles :

```bash
# Tests unitaires uniquement (pas de dépendance externe)
cd backend && npm run test:unit
cd frontend && npm run typecheck

# Audits de sécurité (locaux)
npm audit
npm run lint
npm run typecheck
```

## Rapports et résultats

### Emplacements des rapports

```
maisonnettev2/
├── test-results/
│   ├── playwright/
│   │   ├── index.html               # Rapport Playwright
│   │   └── ...
│   └── cucumber-report.html         # Rapport Cucumber
└── coverage/                         # Couverture de code (si activée)
    └── index.html
```

### Consulter les rapports

```bash
# Playwright
open test-results/index.html

# Cucumber
open test-results/cucumber-report.html

# Couverture
cd backend
npm run test:unit -- --coverage
open coverage/index.html
```

## Troubleshooting

### Erreur : "Services not running"

```bash
# Vérifier le status Docker
docker ps

# Lancer les services
cd ../idp && docker-compose up -d
cd ../maisonnettev2 && docker-compose up -d

# Attendre la stabilisation
sleep 15

# Vérifier les health checks
./maisonnettev2/healthcheck.sh
```

### Erreur : "Cannot find module"

```bash
# Reinstaller les dépendances
cd backend && npm install && npm install --save-dev
cd frontend && npm install && npm install --save-dev
```

### Erreur : "Playwright not installed"

```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install
```

### Tests E2E timeout

- Augmenter le timeout : `playwright.config.ts` → `timeout: 30000`
- Vérifier que le frontend est compilé : `npm run build`
- Vérifier que http://localhost:5173 répond : `curl http://localhost:5173`

### Erreur CORS dans E2E

- Frontend et backend sur ports différents (5173 vs 3001) — normal
- Vérifier CORS dans `backend/src/index.ts` :
  ```typescript
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));
  ```

## Intégration CI/CD

Les scripts de test sont prêts pour GitHub Actions :

```yaml
# .github/workflows/test.yml
- name: Run comprehensive tests
  run: |
    cd maisonnettev2
    ./test-suite.sh
```

## Métriques de succès

Une suite de test réussie :
- ✅ **100% des tests unitaires passent**
- ✅ **0 vulnérabilités critiques** (npm audit)
- ✅ **0 erreurs linting** (ESLint)
- ✅ **100% type-safe** (TypeScript strict)
- ✅ **E2E coverage** > 80% (Playwright)
- ✅ **Tous les BDD scénarios passent** (Cucumber)

## Ressources

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [@cucumber/cucumber](https://github.com/cucumber/cucumber-js)
- [Authentik OpenID Connect](https://goauthentik.io/docs/providers-integrations/openid_connect/)
- [OIDC Authorization Code Flow](https://tools.ietf.org/html/rfc6749#section-1.3.1)

---

**Dernière mise à jour** : 2026-08-22
**Mainteneur** : Claude Code
