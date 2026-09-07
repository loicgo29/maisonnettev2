import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class ParsedMessage:
    label: str
    amount: str
    comment: Optional[str] = None


def parse_expense_message(text: str) -> Optional[ParsedMessage]:
    """
    Extrait montant et libellé d'un message libre.
    Formats supportés :
      - "Lidl 47.30"
      - "47,50 Courses alimentaires"
      - "Transport - 12€"
      - "Carburant 35.99 remplissage réservoir"
    """
    text = text.strip()
    if not text:
        return None

    # Pattern 1 : montant au début (avec . ou ,) suivi du libellé
    # Ex: "47.30 Courses" ou "47,50 Lidl"
    match = re.match(r'^([\d.,]+)\s+(.+)$', text)
    if match:
        amount_str = match.group(1).replace(',', '.')
        label = match.group(2).strip()
        if _is_valid_amount(amount_str):
            return ParsedMessage(label=label, amount=amount_str)

    # Pattern 2 : libellé suivi de montant avec € ou € au bout
    # Ex: "Courses 47.30" ou "Transport - 12€" ou "Essence 45 €"
    match = re.match(r'^(.+?)\s*[-–]\s*([\d.,]+)\s*€?\s*$', text)
    if match:
        label = match.group(1).strip()
        amount_str = match.group(2).replace(',', '.')
        if _is_valid_amount(amount_str):
            return ParsedMessage(label=label, amount=amount_str)

    # Pattern 3 : libellé suivi de montant avec €
    # Ex: "Lidl 47.30" ou "Transport12€"
    match = re.search(r'([\d.,]+)\s*€', text)
    if match:
        amount_str = match.group(1).replace(',', '.')
        # Tout ce avant le montant est le label
        label = text[:match.start()].strip()
        if label and _is_valid_amount(amount_str):
            return ParsedMessage(label=label, amount=amount_str)

    # Pattern 4 : montant à la fin sans symbole
    # Ex: "Courses alimentaires 47.30"
    match = re.search(r'\s+([\d.,]+)\s*$', text)
    if match:
        amount_str = match.group(1).replace(',', '.')
        label = text[:match.start()].strip()
        if label and _is_valid_amount(amount_str):
            return ParsedMessage(label=label, amount=amount_str)

    return None


def _is_valid_amount(amount_str: str) -> bool:
    """Vérifie que la chaîne est un montant valide."""
    try:
        float(amount_str)
        return float(amount_str) > 0
    except ValueError:
        return False
