# CLAUDE.md – alo (comptabilité familiale)

Application de répartition des dépenses familiales. Ce dossier vit désormais
**dans le repo maisonnettev2** (rapatrié le 2026-09-07 : le dépôt `alo`
séparé avait sa CI cassée depuis des semaines et n'a jamais publié d'image).
Le dépôt `alo` original n'est plus la source de vérité pour ce code.

## Où ça tourne

- **Local** : conteneur `alo-backend`, buildé depuis ce dossier
  (`docker-compose.yml`, service `alo-backend`), servi derrière Caddy sur
  `http://alo.maisonnette.localhost:8030`, protégé par l'authentification du
  backoffice (`forward_auth` vers `/api/backoffice/auth/verify`).
- **Production (Hetzner)** : même principe, image publiée par la CI de
  maisonnettev2 sur `ghcr.io/loicgo29/maisonnettev2-alo-backend`, servie sur
  `alo.maisonnette-pecheur-bertheaume.fr`.
- alo n'a **aucune authentification propre** : c'est Caddy qui la lui
  apporte, sans toucher au code.

## Base de données

- **PostgreSQL**, pas SQLite : alo lit le schéma `alo` du Postgres partagé de
  maisonnettev2 (`postgres-maisonnettev2` en local, `postgres` en prod).
- Le schéma est sélectionné uniquement via `search_path` dans
  `DATABASE_URL` (`?options=-csearch_path%3Dalo`) — rien dans le code Python
  ne le qualifie explicitement.
- Migrations : Alembic (`alembic/`), comme avant.

## Quick Start (dev local, hors Docker)

```bash
# Installer les dépendances (uv)
uv sync --group dev

# Lancer le serveur FastAPI (hot reload)
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Tests unitaires purs (pas besoin de serveur ni de DB) — ce sont ceux
# lancés par la CI (job "alo - Lint & Tests unitaires")
uv run pytest tests/test_categorizer.py tests/test_telegram_parser.py -v

# Lint et format
uv run ruff check .
uv run ruff format .

# Migrations (après modification d'un modèle)
uv run alembic revision --autogenerate -m "description du changement"
uv run alembic upgrade head
```

Pour tester l'intégration réelle (auth backoffice, routage Caddy, vraies
données), utiliser `docker-compose up -d` depuis la racine de maisonnettev2
et lancer `tests/alo-api-workflow.spec.ts` (Playwright) plutôt que les tests
Python `test_api_bdd.py`/`test_ui*.py`, qui ciblent l'ancien mode standalone
et sont exclus de la CI (voir plus bas).

## Architecture

### Couches

1. **Models** (`app/models/`) — modèles SQLAlchemy. Un modèle par fichier.
   - `expense.py` : Expense (table centrale), dépend de Account et Period
   - `account.py` : Account et AccountBalance
   - `sharing.py` : SharingEntry (répartition calculée par personne)
   - `child.py` : Child et PresencePeriod (ratios de garde)
   - `period.py` : Period (instantanés figés dans le temps)

2. **Schemas** (`app/schemas/`) — modèles Pydantic de validation. Un par modèle.

3. **Routers** (`app/routers/`) — endpoints FastAPI groupés par domaine, sans
   logique métier : valider l'entrée → appeler le service → retourner la
   réponse.

4. **Services** (`app/services/`) — la logique métier.
   - `sharing_calculator.py` — calcule les ratios et montants de répartition
   - `categorizer.py` — catégorise automatiquement par mots-clés (règles YAML)
   - `period_manager.py` — cycle de vie des périodes (draft → frozen)
   - `csv_importer.py` — parse et importe les exports bancaires CSV
   - `excel_exporter.py` — génère les rapports Excel

5. **Database** (`app/database.py`) — moteur SQLAlchemy, factory de session,
   classe Base déclarative.

### Principe clé

**La logique métier vit dans les services, jamais dans les routers.**

## Conventions

### Types de données

- **Montants** : toujours `Decimal`, jamais `float`
- **Dates** : type `date` (sauf timestamps de création/mise à jour, `datetime`)
- **Identifiants de personnes** : `"adulte1"` et `"adulte2"` (jamais de vrais noms en dur)
- **Statuts** : chaînes (`"draft"` / `"frozen"`), jamais de booléens

### Catégories de dépenses

Taxonomie réellement en vigueur côté API (vérifiée sur `/openapi.json`) :
`quotepart`, `50/50`, `dette`, `brico`, `virement`, `trop_plein`,
`regule_periode`, `divers`.

`categorizer.py` utilise une taxonomie YAML **distincte** (`alimentation`,
`logement`, etc. — voir `data/categorization_rules.yaml`) pour étiqueter les
imports CSV/Telegram (`yaml_category`) ; ce n'est pas la même liste que le
champ `category` de l'API. Ne pas confondre les deux en écrivant un test ou
une règle.

### Règles de répartition, par ordre de priorité

1. Correction manuelle (`"manuel"`)
2. Ratio de garde (`"garde_ratio"`, catégorie "enfants" uniquement)
3. Répartition par défaut (`"50/50"`)

### Immutabilité

- `Expense.status = "frozen"` → non modifiable (409 sur PUT/DELETE)
- `Period.status = "frozen"` → aucune dépense de la période ne peut changer
- Vérifié par les tests d'intégration (`tests/alo-api-workflow.spec.ts`)

## Catégorisation

- **Fichier de règles** : `data/categorization_rules.yaml`
- **Format** : mots-clés et regex par catégorie
- **Rechargé à la requête**, pas besoin de redémarrer
- **Repli** : `"divers"` si aucune correspondance

## Bot Telegram

- Processus séparé d'uvicorn (évite les conflits de boucle asyncio)
- Poste vers `http://localhost:8000/api/imports/telegram`
- Formats acceptés : "Lidl 47.30", "47,50 Courses", "Transport - 12€"
- Non déployé dans l'intégration maisonnettev2 actuelle (pas de service bot
  dans le compose) — le code reste présent (`telegram_bot/`) pour un usage
  local futur ou une réintégration.

## Pièges connus

### Le ratio de garde doit sommer à 1.0

Toujours vérifier que `get_garde_ratio()` retourne des ratios sommant à
exactement 1.0 (aux arrondis près). Un ratio faux fausse tous les calculs.

### L'état figé est une frontière de sécurité

Une fois une période (ou dépense) figée, elle devient en lecture seule.
Appliqué dans chaque router qui modifie des données :
`if expense.status == "frozen": raise HTTPException(409, ...)`.

## Tests

### Unitaires (lancés par la CI)

```bash
uv run pytest tests/test_categorizer.py tests/test_telegram_parser.py -v
```

### Exclus de la CI, à connaître

- `test_api_bdd.py` — exige un serveur direct sur `localhost:8000` (ancien
  mode standalone, sans auth backoffice)
- `test_ui.py`, `test_ui_fixed.py`, `test_ui_simple.py` — ciblent l'ancienne
  UI HTML statique, remplacée par le frontend React actuel
- `test_healthcheck.py` — script manuel, pas de fonctions `test_*`

L'intégration réelle (auth, routage, vraies données) est couverte par
`tests/alo-api-workflow.spec.ts` côté maisonnettev2.

## Related Skills

- `incremental-implementation` pour les changements multi-fichiers
- `security-and-hardening` pour la validation des entrées API
- `api-and-interface-design` pour tout nouvel endpoint
- `documentation-and-adrs` pour toute décision d'architecture significative
