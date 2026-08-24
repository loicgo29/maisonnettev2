# Caddy BDD Tests - Quick Start Guide

## En 3 étapes

### 1. Démarrer les services
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2
docker-compose up -d
```

### 2. Lancer les tests Caddy
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend
npm run test:bdd
```

### 3. Consulter les résultats
```bash
# JSON report
cat cucumber-report.json

# HTML report (open in browser)
open cucumber-report.html
```

## Commandes utiles

```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2/backend

# Lancer UNIQUEMENT les tests Caddy
npx cucumber-js features/caddy.feature

# Lancer avec format personnalisé
npx cucumber-js features/caddy.feature --format json:caddy-report.json

# Lancer un scénario spécifique
npx cucumber-js features/caddy.feature --name "Caddy route /api"

# Lancer avec verbose output
npx cucumber-js features/caddy.feature --format progress

# Lancer tous les tests (lint + types + unit + BDD)
npm run test:all
```

## Architecture des tests

```
maisonnettev2/
├── backend/
│   ├── features/
│   │   ├── caddy.feature                    ← Tests Caddy (13 scénarios)
│   │   ├── reservations.feature             ← Tests existants
│   │   └── step_definitions/
│   │       ├── caddy.steps.ts               ← Steps pour Caddy
│   │       ├── authentication.steps.ts      ← Steps existants
│   │       └── reservations.steps.ts        ← Steps existants
│   └── package.json
│       └── "test:bdd": "cucumber-js features/"
│
├── CADDY_BDD_TESTS.md                       ← Documentation complète
└── CADDY_BDD_QUICK_START.md                 ← Ce fichier
```

## Ce qui est testé

✅ Routage `/api` → backend (port 3001)
✅ Routage `/uploads` → backend  
✅ Routage `/` → frontend (port 3000)
✅ En-têtes de sécurité (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
✅ Suppression du header Server
✅ Compression (gzip/deflate)
✅ Transmission des requêtes (Authorization headers)
✅ Gestion CORS (OPTIONS)
✅ Logging des accès
✅ Connectivité TCP (ports 80, 443)

## Technologies utilisées

| Stack | Version |
|-------|---------|
| **Cucumber.js** | 12.9.0 |
| **TypeScript** | 5.3.3 |
| **axios** | 1.19.0 |
| **expect** | latest |
| **Node.js** | ≥20 |

## Prérequis pour exécuter

- Docker & Docker Compose
- Node.js ≥ 20
- npm ou yarn

## Services requis

| Service | URL | Port | Status |
|---------|-----|------|--------|
| Caddy (reverse proxy) | `http://localhost` | 80 | Sous test |
| Backend API | `http://localhost:3001` | 3001 | Healthcheck requis |
| Frontend SvelteKit | `http://localhost:3000` | 3000 | Disponibilité requise |

## Dépannage

### Les tests ne trouvent pas Caddy
```bash
# Vérifiez que les services sont lancés
docker-compose ps

# Testez manuellement
curl -I http://localhost/
```

### Erreur "ECONNREFUSED"
```bash
# Les services n'ont peut-être pas fini de démarrer
# Attendez 5-10 secondes après docker-compose up
sleep 10
npm run test:bdd
```

### Tests qui passent localement mais échouent en CI
- Assurez-vous que les DNS/résolution d'hôte fonctionne (localhost → 127.0.0.1)
- Vérifiez que docker-compose crée le réseau `nas-network`

## Intégration CI/CD

Les tests s'intègrent dans le pipeline avec:
```json
{
  "scripts": {
    "test:all": "npm run lint && npm run type-check && npm run test && npm run test:bdd"
  }
}
```

## Résultats attendus

```
✓ Caddy route /api vers le backend
✓ Caddy route /api/* vers le backend correctement
✓ Caddy route /uploads/* vers le backend
✓ Caddy route les requêtes sans /api vers le frontend
✓ Caddy accepte les connexions sur le port 80
✓ Caddy ajoute les en-têtes de sécurité
✓ Caddy supprime le header Server
✓ Caddy compresse les réponses en gzip
✓ Caddy enregistre les accès
✓ Caddy route correctement les sous-domaines
✓ Caddy forward correctement les en-têtes de requête
✓ Caddy gère les requêtes OPTIONS (CORS)
✓ Caddy rejette les connexions HTTPS non configurées

13 scenarios passed
```

## Fichiers créés

| Fichier | Taille | Contenu |
|---------|--------|---------|
| `backend/features/caddy.feature` | 2.4 KB | 13 scénarios Gherkin en français |
| `backend/features/step_definitions/caddy.steps.ts` | 9.5 KB | Step definitions TypeScript |
| `CADDY_BDD_TESTS.md` | 6.7 KB | Documentation complète |
| `CADDY_BDD_QUICK_START.md` | Ce fichier | Guide rapide |

## Support et améliorations

Voir [CADDY_BDD_TESTS.md](./CADDY_BDD_TESTS.md) pour:
- Documentation détaillée
- Debugging
- Améliorations futures
- Architecture complète

---

**Créé:** 24 août 2026 | **Technologie:** Cucumber.js + TypeScript | **Langage:** Français
