# Configuration ALO - Accès par IP locale

## ⚠️ Problème rencontré

Le port 8000 était utilisé par un tunnel SSH, empêchant l'API FastAPI de démarrer.

## ✅ Solution

**L'API tourne maintenant sur le port 8080** (au lieu de 8000).

### URLs d'accès

| Type | Localhost | Réseau local |
|---|---|---|
| Frontend | `http://localhost:8080/` | `http://192.168.1.34:8080/` |
| API | `http://localhost:8080/api/` | `http://192.168.1.34:8080/api/` |
| Health | `http://localhost:8080/api/health` | `http://192.168.1.34:8080/api/health` |

### Démarrer l'application

```bash
cd /Volumes/logousb/SSD/Projects/alo/app
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

### Avantages du port 8080

- ✅ Accessible via `localhost:8080`
- ✅ Accessible via IP locale `192.168.1.34:8080`
- ✅ Accessible depuis d'autres machines du réseau
- ✅ Standard pour les applications web locales

### Frontend

Le frontend utilise des **chemins relatifs** (`/api`) donc il fonctionne automatiquement :
- Via `localhost:8080` → API sur `localhost:8080/api` ✓
- Via `192.168.1.34:8080` → API sur `192.168.1.34:8080/api` ✓

Aucune modification du code frontend n'est nécessaire.

### Tests

Pour mettre à jour les tests avec le nouveau port, modifier :

**tests/test_healthcheck.py** (ligne 9)
```python
BASE_URL = "http://localhost:8080"  # Avant: "http://localhost:8000"
```

**tests/test_api_bdd.py** (ligne 11)
```python
BASE_URL = "http://localhost:8080"  # Avant: "http://localhost:8000"
```

**tests/test_ui_fixed.py** (ligne 7)
```python
BASE_URL = "http://localhost:8080"  # Avant: "http://localhost:8000"
```

Puis relancer les tests :
```bash
python -m pytest tests/ -v
```

---

**L'application ALO est maintenant entièrement accessible via IP locale !** 🌐
