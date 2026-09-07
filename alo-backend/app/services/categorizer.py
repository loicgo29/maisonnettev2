import re
import unicodedata
import yaml
from pathlib import Path
from typing import Dict, List, Optional


class Categorizer:
    """Catégorise automatiquement une dépense selon son libellé."""

    def __init__(self, rules_path: Optional[str] = None):
        if rules_path is None:
            rules_path = Path(__file__).parent.parent.parent / "data" / "categorization_rules.yaml"
        else:
            rules_path = Path(rules_path)

        self.rules_path = rules_path
        self.rules = self._load_rules()

    def _load_rules(self) -> Dict[str, Dict]:
        """Charge les règles depuis le fichier YAML."""
        if not self.rules_path.exists():
            print(f"Avertissement : {self.rules_path} non trouvé. Catégorisation désactivée.")
            return {"divers": {"keywords": [], "regex": []}}

        try:
            with open(self.rules_path, "r", encoding="utf-8") as f:
                rules = yaml.safe_load(f) or {}
                return rules
        except Exception as e:
            print(f"Erreur lors du chargement des règles : {e}")
            return {"divers": {"keywords": [], "regex": []}}

    def _normalize(self, text: str) -> str:
        """Normalise le texte : minuscules, suppression accents."""
        # Minuscules
        text = text.lower()
        # Suppression accents
        text = "".join(
            c for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )
        return text

    def categorize(self, label: str) -> str:
        """
        Retourne la catégorie pour ce label.
        Priorité : keywords (exact match), puis regex.
        Retourne "divers" par défaut.
        """
        normalized_label = self._normalize(label)

        for category, rules in self.rules.items():
            # Cherche d'abord dans les keywords
            keywords = rules.get("keywords", [])
            for keyword in keywords:
                if self._normalize(keyword) in normalized_label:
                    return category

            # Puis dans les regex
            regex_patterns = rules.get("regex", [])
            for pattern in regex_patterns:
                try:
                    if re.search(pattern, normalized_label, re.IGNORECASE):
                        return category
                except re.error:
                    pass

        return "divers"
