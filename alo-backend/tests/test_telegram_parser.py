"""Tests pour le parser Telegram."""

import sys
from pathlib import Path

# Ajoute le chemin pour importer les modules
app_dir = Path(__file__).parent.parent / "telegram_bot"
sys.path.insert(0, str(app_dir))

from parser import parse_expense_message


def test_parser_basic_format():
    """Test le format "Lidl 47.30"."""
    result = parse_expense_message("Lidl 47.30")
    assert result is not None
    assert result.label == "Lidl"
    assert result.amount == "47.30"


def test_parser_amount_first():
    """Test le format "47.50 Courses"."""
    result = parse_expense_message("47.50 Courses alimentaires")
    assert result is not None
    assert result.label == "Courses alimentaires"
    assert result.amount == "47.50"


def test_parser_comma_decimal():
    """Test avec virgule décimale française."""
    result = parse_expense_message("47,50 Lidl")
    assert result is not None
    assert result.label == "Lidl"
    assert result.amount == "47.50"  # Convertit en point


def test_parser_with_euro_symbol():
    """Test avec symbole €."""
    result = parse_expense_message("Transport - 12€")
    assert result is not None
    assert result.label == "Transport"
    assert result.amount == "12"


def test_parser_invalid():
    """Test un format invalide."""
    result = parse_expense_message("Quelque chose sans montant")
    assert result is None


def test_parser_multiple_spaces():
    """Test avec plusieurs espaces."""
    result = parse_expense_message("  Carrefour    35.99  ")
    assert result is not None
    assert result.label == "Carrefour"
    assert result.amount == "35.99"


if __name__ == "__main__":
    test_parser_basic_format()
    test_parser_amount_first()
    test_parser_comma_decimal()
    test_parser_with_euro_symbol()
    test_parser_invalid()
    test_parser_multiple_spaces()
    print("✓ Tous les tests du parser passent")
