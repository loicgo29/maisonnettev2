# Caddy BDD Tests - Documentation

## Vue d'ensemble

Tests BDD complets pour le reverse proxy Caddy, utilisant Cucumber.js + TypeScript. Suit la même structure et technologie que les tests BDD existants du projet.

## Localisation des fichiers

### Fichier Feature (Gherkin)
- **Emplacement:** `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/features/caddy.feature`
- **Langage:** Gherkin français (compatibilité avec les autres tests)
- **Nombre de scénarios:** 13

### Step Definitions (TypeScript)
- **Emplacement:** `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/features/step_definitions/caddy.steps.ts`
- **Framework:** Cucumber.js + axios + expect
- **Dépendances utilisées:** axios (HTTP client), expect (assertions)

## Scénarios de test couverts

### 1. Routage de base
- ✅ Route `/api` vers le backend
- ✅ Route `/api/*` vers le backend correctement
- ✅ Route `/uploads/*` vers le backend
- ✅ Route les requêtes sans `/api` vers le frontend

### 2. Connectivité et ports
- ✅ Accepte les connexions sur le port 80
- ✅ Rejette les connexions HTTPS non configurées (port 443)

### 3. Sécurité (En-têtes de sécurité)
- ✅ Ajoute `X-Content-Type-Options: nosniff`
- ✅ Ajoute `X-Frame-Options: SAMEORIGIN`
- ✅ Ajoute `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ Supprime le header `Server`

### 4. Compression
- ✅ Compresse les réponses (gzip/deflate)

### 5. Transmission des requêtes
- ✅ Forward correctement les en-têtes de requête (notamment Authorization)
- ✅ Gère les requêtes OPTIONS (CORS)

### 6. Logging
- ✅ Enregistre les accès aux logs

## Commandes pour lancer les tests

### Lancer tous les tests BDD du backend
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npm run test:bdd
```

### Lancer UNIQUEMENT les tests Caddy
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npx cucumber-js features/caddy.feature
```

### Lancer les tests Caddy avec un format spécifique
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npx cucumber-js features/caddy.feature --format json:cucumber-report.json
```

### Lancer tous les tests (lint + type-check + unit + BDD)
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npm run test:all
```

## Prérequis pour les tests

Les services suivants doivent être disponibles:

| Service | URL | Port | Rôle |
|---------|-----|------|------|
| Caddy | `http://localhost:80` | 80 | Reverse proxy sous test |
| Backend | `http://localhost:3001` | 3001 | Service routé par Caddy |
| Frontend | `http://localhost:3000` | 3000 | Service routé par Caddy |

### Démarrer les services pour les tests

**Avec docker-compose (depuis la racine du projet):**
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2
docker-compose up -d
```

**Vérifier que les services sont prêts:**
```bash
# Test Caddy
curl -I http://localhost/

# Test Backend
curl -I http://localhost:3001/health

# Test Frontend
curl -I http://localhost:3000
```

## Structure des Step Definitions

### Given steps (Contexte)
- `Caddy est disponible sur http://localhost:80` - Vérifie la disponibilité
- `le backend est accessible sur http://localhost:3001` - Vérification healthcheck
- `le frontend est accessible sur http://localhost:3000` - Vérification disponibilité

### When steps (Actions)
- `j'appelle GET {url} via Caddy` - Fait une requête GET à travers Caddy
- `j'appelle GET {url} via Caddy avec un header Authorization` - GET avec token
- `j'appelle OPTIONS {url} via Caddy` - Requête OPTIONS (CORS)
- `je test la connectivité {url}` - Test de connectivité TCP

### Then steps (Assertions)
- `la réponse est {status}` - Vérifie le code HTTP exact
- `la réponse est {status} ou {status}` - Vérifie un code parmi plusieurs
- `le header {name} contient {value}` - Vérifie un en-tête
- `le header {name} n'existe pas` - Vérifie l'absence d'un en-tête
- `la connexion est établie` - Vérifie la connectivité
- `la connexion échoue ou n'est pas configurée` - Vérifie l'absence de connexion

## Variables de contexte et état

Chaque test maintient un contexte avec:
- `caddyClient` - Client HTTP axios pré-configuré
- `statusCode` - Code HTTP de la dernière réponse
- `response` - Corps de la réponse
- `headers` - En-têtes de réponse
- `error` - Erreur éventuelle
- `requestHeaders` - En-têtes de la requête

## Rapports de test

Après lancer les tests, les rapports sont générés:

| Format | Fichier | Chemin |
|--------|---------|--------|
| JSON | `cucumber-report.json` | `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/` |
| HTML | `cucumber-report.html` | `/Volumes/logousb/SSD/Projects/maisonnettev2/backend/` |

## Intégration avec CI/CD

Les tests BDD Caddy s'intègrent automatiquement dans le pipeline:

```bash
npm run test:all
# Exécute: lint + type-check + unit tests (vitest) + BDD tests (cucumber)
```

## Notes importantes

1. **Langage:** Les tests utilisent le français (Gherkin `# language: fr`) pour cohérence avec les tests existants
2. **TypeScript:** Les step definitions sont en TypeScript compilé via ts-node
3. **Async/Await:** Tous les steps supportent les opérations asynchrones
4. **Timeout:** Les tests ont un timeout de 5 secondes par défaut pour les connexions
5. **Validation:** Les assertions utilisent `expect` du package npm `expect`

## Debugging des tests

### Afficher les logs détaillés
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
DEBUG=* npx cucumber-js features/caddy.feature
```

### Lancer un test spécifique
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npx cucumber-js features/caddy.feature --name "Caddy route /api"
```

### Générer un rapport HTML
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npx cucumber-js features/caddy.feature --format html:cucumber-report.html
```

## Améliorations futures

- [ ] Ajouter tests pour les sous-domaines (alo.logo-solutions.fr, etc.)
- [ ] Ajouter tests pour HTTPS/TLS (quand disponible)
- [ ] Ajouter tests de performance (latence, throughput)
- [ ] Ajouter tests d'erreurs (timeouts, connexions fermées)
- [ ] Ajouter tests de load balancing (si configuré)
- [ ] Intégrer avec Playwright pour tests E2E complets

## Fichiers modifiés/créés

| Fichier | Statut | Description |
|---------|--------|-------------|
| `/backend/features/caddy.feature` | Créé | Fichier Gherkin avec 13 scénarios |
| `/backend/features/step_definitions/caddy.steps.ts` | Créé | Step definitions TypeScript |

Aucun fichier existant n'a été modifié.

## Références

- [Documentation Cucumber.js](https://github.com/cucumber/cucumber-js)
- [Caddy Reverse Proxy](https://caddyserver.com/)
- [Configuration Caddy du projet](./caddy/Caddyfile)
- [Tests BDD existants](./backend/features/step_definitions/)
