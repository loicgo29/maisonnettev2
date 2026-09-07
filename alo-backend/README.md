# ALO – Gestion des dépenses familiales

Une application locale Python/FastAPI pour centraliser, partager et analyser les dépenses familiales.

## Fonctionnalités

✅ **Gestion des dépenses**
- Création manuelle ou automatique (via Telegram)
- Catégorisation intelligente (keywords + regex rules)
- Statuts : draft / frozen (lecture seule)

✅ **Répartition automatique**
- 50/50 par défaut
- Ratio de garde pour la catégorie "enfants"
- Override manuel possible

✅ **Périodes figées**
- Grouper les dépenses en périodes
- Figurer une période pour la rendre read-only
- Agrégation des totaux par adulte

✅ **Bot Telegram**
- Formats libres : "Lidl 47.30", "47,50 Courses", "Transport - 12€"
- Commandes : /start, /last, /total
- Auto-catégorisation

✅ **Export Excel**
- 3 feuilles : Résumé, Dépenses, Par catégorie
- Uniquement pour les périodes figées

✅ **Interface Web**
- Tableau des dépenses
- Création de nouvelles dépenses
- Vue des périodes
- Statistiques simples

## Installation

### Prérequis
- Python 3.9+
- uv (gestionnaire de paquets)
- Optionnel : Bot Telegram

### Étapes

```bash
# Clone ou télécharge le projet
cd /Volumes/logousb/SSD/Projects/alo/app

# Installe les dépendances
uv sync --group dev

# Configure l'environnement
cp .env.example .env
# Édite .env avec tes tokens Telegram (voir TELEGRAM_SETUP.md)

# Initialise la base de données
uv run alembic upgrade head

# Démarre l'API
uv run uvicorn app.main:app --reload --port 8000

# En autre terminal : démarre le bot Telegram
uv run python -m telegram_bot.bot
```

## Architecture

```
app/
├── app/
│   ├── main.py              # FastAPI, montage des routers
│   ├── config.py            # Settings (Pydantic)
│   ├── database.py          # SQLAlchemy setup
│   ├── models/              # ORM (Expense, Period, etc.)
│   ├── schemas/             # Pydantic models (validation)
│   ├── routers/             # FastAPI endpoints
│   ├── services/            # Business logic
│   ├── static/              # Frontend HTML/JS
│   └── __init__.py
├── telegram_bot/            # Bot Telegram (process séparé)
├── data/
│   ├── alo.db               # SQLite database
│   ├── categorization_rules.yaml
│   ├── exports/             # Excel files
│   └── imports/             # CSV files
├── tests/                   # Unit tests
├── CLAUDE.md                # Guidance pour Claude Code
├── TELEGRAM_SETUP.md        # Guide de configuration du bot
└── pyproject.toml           # Dependencies
```

## Routes API

```
GET  /                          # Frontend HTML
GET  /docs                      # Swagger UI
GET  /api/health                # Health check

GET    /api/expenses            # List expenses
POST   /api/expenses            # Create expense
GET    /api/expenses/{id}       # Get expense
PUT    /api/expenses/{id}       # Update (draft only)
DELETE /api/expenses/{id}       # Delete (draft only)
POST   /api/expenses/{id}/recalculate

GET    /api/periods             # List periods
POST   /api/periods             # Create period
GET    /api/periods/{id}        # Get period
GET    /api/periods/{id}/summary
PUT    /api/periods/{id}        # Update (draft only)
POST   /api/periods/{id}/freeze # Freeze (immutable)
DELETE /api/periods/{id}        # Delete (empty draft only)

POST   /api/imports/telegram    # Import from Telegram
POST   /api/imports/csv         # Import from CSV (TODO)

GET    /api/exports/excel/{period_id}  # Export Excel
```

## Utilisation

### Web UI (http://localhost:8000)
- **Dépenses** : liste des dépenses récentes
- **Ajouter une dépense** : formulaire pour créer manuellement
- **Périodes** : vue des groupes de dépenses
- **Statistiques** : totaux et moyennes

### Bot Telegram
Envoie des messages libres au bot :
- "Lidl 47.30" → crée une dépense "Lidl" de 47.30€
- "47,50 Courses" → crée une dépense "Courses" de 47.50€
- "Transport - 12€" → crée une dépense "Transport" de 12€

Commandes :
- `/start` → aide et instructions
- `/last` → 5 dernières dépenses
- `/total` → total du mois courant

### API HTTP (Swagger sur /docs)
```bash
# Créer une dépense
curl -X POST http://localhost:8000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-23",
    "label": "Carrefour",
    "amount": 32.50,
    "category": "alimentation",
    "source": "manuel"
  }'

# Lister les dépenses
curl http://localhost:8000/api/expenses

# Créer une période
curl -X POST http://localhost:8000/api/periods \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mai 2026",
    "start_date": "2026-05-01",
    "end_date": "2026-05-31"
  }'

# Figurer une période
curl -X POST http://localhost:8000/api/periods/1/freeze

# Exporter en Excel
curl -o mai_2026.xlsx http://localhost:8000/api/exports/excel/1
```

## Configuration

### `.env`
```
DATABASE_URL=sqlite:///./data/alo.db
TELEGRAM_BOT_TOKEN=<ton_token_botfather>
TELEGRAM_CHAT_ID=<ton_chat_id>
API_HOST=127.0.0.1
API_PORT=8000
API_BASE_URL=http://localhost:8000
```

Voir [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) pour obtenir un token.

### `data/categorization_rules.yaml`
Modifiable sans redémarrage. Ajoute des keywords ou regex pour chaque catégorie.

## Développement

### Tests
```bash
# Tests unitaires
uv run pytest tests/ -v

# Test du parser Telegram
uv run pytest tests/test_telegram_parser.py -v

# Test de catégorisation
uv run pytest tests/test_categorizer.py -v
```

### Linting
```bash
uv run ruff check .
uv run ruff format .
```

### Migrations BDD
```bash
# Créer une migration après modification des modèles
uv run alembic revision --autogenerate -m "Add field X"

# Appliquer les migrations
uv run alembic upgrade head

# Revenir à une ancienne version
uv run alembic downgrade -1
```

## Conventions

- **Montants** : toujours `Decimal`, jamais `float`
- **Dates** : type `date`, pas `datetime` (sauf timestamps)
- **Personnes** : `"adulte1"` et `"adulte2"` (jamais de noms réels)
- **Statuts** : `"draft"` et `"frozen"` (strings, pas booleans)
- **Catégories** : alimentation, logement, enfants, transport, loisirs, santé, divers

## État du projet (2026-05-23)

**Complété :**
- ✅ Modèles et migrations
- ✅ CRUD expenses + periods
- ✅ Sharing calculator (50/50 + custody ratio)
- ✅ Bot Telegram avec parser
- ✅ Auto-catégorisation
- ✅ Export Excel
- ✅ Frontend HTML/JS minimal
- ✅ Tests unitaires (parser, categorizer)

**À faire :**
- Import CSV depuis exports bancaires
- Tests d'intégration API
- Graphiques pour les statistiques
- Gestion des enfants et périodes de garde
- Multilangue (EN/FR)

## Support

Voir [CLAUDE.md](CLAUDE.md) pour l'architecture détaillée et les pièges communs.

Questions ? Vérifie :
1. [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) pour la config du bot
2. [CLAUDE.md](CLAUDE.md) pour l'architecture et conventions
3. `/docs` (Swagger) pour la documentation API
4. Logs de l'API et du bot pour les erreurs

---

**Développé avec Claude Code – Anthropic**
