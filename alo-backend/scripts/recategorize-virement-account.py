#!/usr/bin/env python3
"""Recatégorise les virements existants avec le bon account_id basé sur le libellé."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense

def recategorize_virement_accounts():
    """Corrige les virements avec le bon account_id basé sur le libellé."""
    db = SessionLocal()
    count = 0

    try:
        # Trouve tous les virements
        expenses = db.query(Expense).filter(
            Expense.category == "virement"
        ).all()

        print(f"🔄 Recatégorisation de {len(expenses)} virements...\n")

        for exp in expenses:
            old_account_id = exp.account_id
            label_upper = exp.label.upper()

            # Détermine le bon account_id basé sur le libellé
            new_account_id = 5  # Default: Fortuneo joint

            if any(name in label_upper for name in ['ALICE', 'VASSEUR']):
                new_account_id = 2  # Alice
            elif any(name in label_upper for name in ['LOIC', 'GOURMELON']):
                new_account_id = 1  # Loïc

            if old_account_id != new_account_id:
                exp.account_id = new_account_id
                count += 1
                account_name = {1: 'Loïc', 2: 'Alice', 5: 'Fortuneo'}.get(new_account_id)
                print(f"  {exp.date} | {exp.label[:40]:40} | account_id: {old_account_id} → {new_account_id} ({account_name})")

        db.commit()
        print(f"\n✅ {count} virements recatégorisés")
        return 0

    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        db.rollback()
        return 1
    finally:
        db.close()

if __name__ == '__main__':
    sys.exit(recategorize_virement_accounts())
