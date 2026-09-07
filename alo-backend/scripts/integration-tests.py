#!/usr/bin/env python3
"""Integration Tests — Valide les workflows end-to-end."""

import sys
from pathlib import Path
from datetime import date
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense, Period
from app.services.sharing_calculator import SharingCalculator

def test_expense_creation():
    """Test: créer une dépense et vérifier qu'elle existe en DB."""
    db = SessionLocal()
    try:
        initial_count = db.query(Expense).count()

        # Créer une dépense test
        test_exp = Expense(
            date=date.today(),
            label="TEST_INTEGRATION",
            amount=Decimal("10.50"),
            category="50/50",
            source="test",
            account_id=1,
            status="draft"
        )
        db.add(test_exp)
        db.commit()

        # Vérifier qu'elle est en DB
        found = db.query(Expense).filter(Expense.label == "TEST_INTEGRATION").first()
        assert found is not None, "Dépense test non trouvée en DB"

        # Cleanup
        db.delete(found)
        db.commit()

        return True, "✅ Expense creation OK"
    except Exception as e:
        return False, f"❌ Expense creation FAILED: {str(e)}"
    finally:
        db.close()

def test_period_immutability():
    """Test: vérifier qu'une période gelée ne peut pas être modifiée."""
    db = SessionLocal()
    try:
        # Trouver une période gelée
        frozen_period = db.query(Period).filter(Period.status == 'frozen').first()

        if not frozen_period:
            return True, "⚠️  Pas de période gelée pour tester"

        # Essayer de modifier
        frozen_period.name = "MODIFIED_TEST"
        db.commit()

        # Vérifier que la modification a échoué (ou alerter)
        db.refresh(frozen_period)
        if frozen_period.name == "MODIFIED_TEST":
            return False, "❌ Période gelée a pu être modifiée (immutabilité cassée)"

        return True, "✅ Period immutability OK"
    except Exception as e:
        return False, f"❌ Period immutability FAILED: {str(e)}"
    finally:
        db.close()

def test_sharing_calculator():
    """Test: vérifier que les calculs de rééquilibrage sont cohérents."""
    db = SessionLocal()
    try:
        # Créer des dépenses test
        test_date = date.today()

        exp1 = Expense(
            date=test_date,
            label="TEST_50_50",
            amount=Decimal("100"),
            category="50/50",
            source="test",
            account_id=5,
            status="draft"
        )
        exp2 = Expense(
            date=test_date,
            label="TEST_BRICO",
            amount=Decimal("50"),
            category="brico",
            source="test",
            account_id=5,
            status="draft"
        )

        db.add_all([exp1, exp2])
        db.commit()

        # Calculer rééquilibrage
        calc = SharingCalculator()
        loic_share, alice_share = calc.calculate_sharing(
            [exp1, exp2],
            adulte1_id=1,
            adulte2_id=2
        )

        # Vérifier que la somme est cohérente
        total_expected = Decimal("100") + Decimal("50")  # 150
        total_actual = loic_share + alice_share

        if total_expected != total_actual:
            return False, f"❌ Somme incohérente: {total_expected} != {total_actual}"

        # Cleanup
        db.query(Expense).filter(Expense.label.like("TEST_%")).delete()
        db.commit()

        return True, f"✅ Sharing calculator OK (Loïc: {loic_share}, Alice: {alice_share})"
    except Exception as e:
        return False, f"❌ Sharing calculator FAILED: {str(e)}"
    finally:
        db.close()

def main():
    print("\n" + "="*60)
    print("🧪 Integration Tests")
    print("="*60 + "\n")

    tests = [
        test_expense_creation,
        test_period_immutability,
        test_sharing_calculator,
    ]

    passed = 0
    failed = 0

    for test in tests:
        success, message = test()
        print(f"{message}")
        if success:
            passed += 1
        else:
            failed += 1

    # Résultat final
    print("\n" + "="*60)
    if failed == 0:
        print(f"✅ TOUS LES TESTS OK — {passed} passed")
        print("="*60 + "\n")
        return 0
    else:
        print(f"❌ TESTS ÉCHOUÉS — {passed} passed, {failed} failed")
        print("="*60 + "\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
