#!/usr/bin/env python3
"""Recatégorise les virements internes existants (trop plein, regule periode)."""

import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense
from sqlalchemy import or_

def recategorize_virements_internes():
    """Recatégorise les virements internes depuis leur catégorie générique."""
    db = SessionLocal()
    count = 0

    try:
        # Trouve toutes les dépenses avec ces patterns depuis leur création
        expenses = db.query(Expense).filter(
            or_(
                Expense.label.ilike('%trop plein%'),
                Expense.label.ilike('%vir gel%')
            ),
            Expense.status != 'frozen'  # Exclut les dépenses gelées
        ).all()

        print(f"🔄 Recatégorisation de {len(expenses)} virements internes...\n")

        for exp in expenses:
            old_category = exp.category

            # Détermine la nouvelle catégorie selon le libellé
            if 'trop plein' in exp.label.lower():
                new_category = "trop_plein"
            elif 'vir gel' in exp.label.lower():
                new_category = "regule_periode"
            else:
                continue  # Ne devrait pas arriver ici

            if old_category != new_category:
                exp.category = new_category
                count += 1
                print(f"  {exp.date} | {exp.label[:45]:45} | {old_category:15} → {new_category:15}")

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
    sys.exit(recategorize_virements_internes())
