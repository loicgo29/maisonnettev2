# Tests E2E de l'Interface Utilisateur ALO

Suite de tests Playwright pour valider l'interface web du frontend ALO.

## Installation

```bash
source venv/bin/activate
pip install playwright pytest-asyncio
playwright install chromium
```

## Exécution

### Tous les tests
```bash
python -m pytest tests/test_ui.py -v
```

### Un test spécifique
```bash
python -m pytest tests/test_ui.py::TestALOUI::test_add_expense -v
```

### Avec rapport HTML
```bash
python -m pytest tests/test_ui.py -v --html=report.html --self-contained-html
```

### Mode headful (voir le navigateur)
Modifier `headless=True` → `headless=False` dans `test_ui.py`

## Couverture des tests

### Navigation
- ✅ Chargement de la page
- ✅ Navigation par onglets (Dépenses ↔ Périodes)

### Onglet Dépenses
- ✅ Formulaire visible et accessible
- ✅ Ajout d'une dépense
- ✅ Filtre par catégorie
- ✅ Suppression d'une dépense avec confirmation
- ✅ Annulation de suppression
- ✅ Champs date par défaut à aujourd'hui
- ✅ Acceptation des décimales (montant)

### Onglet Périodes
- ✅ Formulaire de création visible
- ✅ Création d'une période
- ✅ Tableau avec bonnes colonnes (Nom, Période, Statut, Total, Adulte1, Adulte2)
- ✅ Gel d'une période avec confirmation
- ✅ Bouton Exporter visible après gel
- ✅ Annulation du gel

### UX
- ✅ Formulaires collapsibles (`<details>`)
- ✅ Messages de succès/erreur
- ✅ Modales de confirmation
- ✅ Layout responsive

## Structure des tests

```python
class TestALOUI:
    async def test_page_loads()           # Test 1: Page charge
    async def test_navigation_tabs()      # Test 2: Nav onglets
    async def test_add_expense()          # Test 3: Ajouter dépense
    async def test_filter_by_category()   # Test 4: Filtre catégorie
    async def test_delete_expense()       # Test 5: Supprimer dépense
    async def test_create_period()        # Test 6: Créer période
    async def test_freeze_period()        # Test 7: Geler période
    async def test_export_button()        # Test 8: Bouton export visible
    ...
```

## Notes

- Les tests utilisent des valeurs uniques ("Test UI", "À geler", etc.) pour éviter les conflits
- Chaque test est indépendant et peut être exécuté isolément
- Les temps d'attente (`wait_for_timeout`) gèrent les appels API asynchrones
- Le navigateur Chromium doit être installé avant la première exécution

## Dépannage

### Tests timeout
Augmente les délais dans le test :
```python
await page.wait_for_timeout(2000)  # 2 secondes au lieu de 1
```

### Element not found
Ajoute une attente explicite :
```python
await expect(element).to_be_visible(timeout=5000)
```

### Navigateur ne lance pas
```bash
playwright install chromium
```
