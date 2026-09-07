"""Service d'apprentissage des associations label → catégorie."""

import json
from pathlib import Path
from typing import Optional

# Chemin du fichier de règles apprises
RULES_FILE = Path(__file__).parent.parent.parent / "data" / "label_category_rules.json"


def _load_rules() -> dict:
    """Charge les règles apprises depuis le fichier JSON."""
    if RULES_FILE.exists():
        try:
            with open(RULES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_rules(rules: dict) -> None:
    """Sauvegarde les règles apprises dans le fichier JSON."""
    RULES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(RULES_FILE, 'w', encoding='utf-8') as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)


def get_learned_category(label: str) -> Optional[str]:
    """
    Cherche si le label matche une règle apprendre.

    Cherche une correspondance (substring) avec les règles apprises.
    Retourne la catégorie si trouvée, None sinon.

    Args:
        label: le libellé de la dépense

    Returns:
        La catégorie (ex: "quotepart") ou None
    """
    if not label:
        return None

    rules = _load_rules()
    label_norm = label.lower().strip()

    # Chercher les keywords qui matche le label (ordre décroissant de longueur)
    for keyword in sorted(rules.keys(), key=len, reverse=True):
        if keyword.lower() in label_norm:
            return rules[keyword]

    return None


def save_rule(label: str, category: str) -> None:
    """
    Mémorise l'association label → catégorie.

    Stocke la clé comme sous-chaîne normalisée (lowercase + strip).

    Args:
        label: le libellé de la dépense
        category: la catégorie (ex: "quotepart", "50/50", etc.)
    """
    if not label or not category:
        return

    rules = _load_rules()
    key = label.lower().strip()

    # Stocker la première partie du label comme clé (ou le tout petit si court)
    # Ex: "Lidl Montpellier" → stocker comme "lidl"
    parts = key.split()
    key_to_store = parts[0] if parts else key

    rules[key_to_store] = category
    _save_rules(rules)


def delete_rule(key: str) -> None:
    """Supprime une règle apprendre."""
    rules = _load_rules()
    if key in rules:
        del rules[key]
        _save_rules(rules)


def list_rules() -> dict:
    """Retourne toutes les règles apprises."""
    return _load_rules()
