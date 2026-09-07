"""Tests pour le service de catégorisation."""

import sys
from pathlib import Path

# Ajoute le chemin
app_dir = Path(__file__).parent.parent
sys.path.insert(0, str(app_dir))

from app.services.categorizer import Categorizer


def test_categorizer_alimentation():
    """Test catégorisation alimentaire."""
    cat = Categorizer()

    assert cat.categorize("Lidl") == "alimentation"
    assert cat.categorize("Carrefour") == "alimentation"
    assert cat.categorize("Casino") == "alimentation"
    assert cat.categorize("Restaurant") == "alimentation"
    assert cat.categorize("Pizza") == "alimentation"


def test_categorizer_logement():
    """Test catégorisation logement."""
    cat = Categorizer()

    assert cat.categorize("Loyer") == "logement"
    assert cat.categorize("EDF électricité") == "logement"
    assert cat.categorize("Internet") == "logement"


def test_categorizer_enfants():
    """Test catégorisation enfants."""
    cat = Categorizer()

    assert cat.categorize("École") == "enfants"
    assert cat.categorize("Crèche") == "enfants"
    assert cat.categorize("Jouet enfant") == "enfants"


def test_categorizer_transport():
    """Test catégorisation transport."""
    cat = Categorizer()

    assert cat.categorize("Essence 50L") == "transport"
    assert cat.categorize("Parking") == "transport"
    assert cat.categorize("Bus") == "transport"


def test_categorizer_loisirs():
    """Test catégorisation loisirs."""
    cat = Categorizer()

    assert cat.categorize("Cinéma") == "loisirs"
    assert cat.categorize("Netflix") == "loisirs"
    assert cat.categorize("Musée") == "loisirs"


def test_categorizer_sante():
    """Test catégorisation santé."""
    cat = Categorizer()

    assert cat.categorize("Pharmacie") == "sante"
    assert cat.categorize("Dentiste") == "sante"
    assert cat.categorize("Médecin") == "sante"


def test_categorizer_default():
    """Test retour par défaut 'divers'."""
    cat = Categorizer()

    assert cat.categorize("Quelque chose de très spécial") == "divers"
    assert cat.categorize("XYZ ABC DEF") == "divers"


def test_categorizer_case_insensitive():
    """Test insensibilité à la casse."""
    cat = Categorizer()

    assert cat.categorize("LIDL") == "alimentation"
    assert cat.categorize("lidl") == "alimentation"
    assert cat.categorize("LiDl") == "alimentation"


def test_categorizer_accents():
    """Test insensibilité aux accents."""
    cat = Categorizer()

    assert cat.categorize("École maternelle") == "enfants"
    assert cat.categorize("Ecole maternelle") == "enfants"
    assert cat.categorize("électricité") == "logement"
    assert cat.categorize("electricite") == "logement"


if __name__ == "__main__":
    test_categorizer_alimentation()
    test_categorizer_logement()
    test_categorizer_enfants()
    test_categorizer_transport()
    test_categorizer_loisirs()
    test_categorizer_sante()
    test_categorizer_default()
    test_categorizer_case_insensitive()
    test_categorizer_accents()
    print("✓ Tous les tests de catégorisation passent")
