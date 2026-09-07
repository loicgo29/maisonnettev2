#!/usr/bin/env python3
"""Recatégorise KERBIO en quotepart depuis 2026-05-22."""

import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense
from app.services.categorizer import Categorizer

def recategorize_kerbio():
    """Recatégorise KERBIO, FARINE, GRAINE DE BIO, LA FOURCHE en quotepart depuis 2026-05-22."""
    db = SessionLocal()
    categorizer = Categorizer()
    count = 0

    try:
        start_date = date(2026, 5, 22)

        # Trouve toutes les dépenses avec ces keywords depuis cette date
        from sqlalchemy import or_
        expenses = db.query(Expense).filter(
            Expense.date >= start_date,
            or_(
                Expense.label.ilike('%kerbio%'),
                Expense.label.ilike('%farine%'),
                Expense.label.ilike('%graine de bio%'),
                Expense.label.ilike('%la fourche%'),
                Expense.label.ilike('%poisson viande%')
            )
        ).all()

        print(f"🔄 Recatégorisation de {len(expenses)} dépenses KERBIO...\n")

        for exp in expenses:
            old_category = exp.category
            yaml_cat = categorizer.categorize(exp.label)

            # Map la catégorie YAML
            category_map = {
                "alimentation": "50/50",
                "logement": "50/50",
                "enfants": "50/50",
                "transport": "50/50",
                "loisirs": "50/50",
                "sante": "50/50",
                "brico": "brico",
                "quotepart": "quotepart",
                "virement": "virement",
                "divers": "divers",
            }
            new_category = category_map.get(yaml_cat, "divers")

            if old_category != new_category:
                exp.category = new_category
                count += 1
                print(f"  {exp.date} | {exp.label[:40]:40} | {old_category:10} → {new_category:10}")

        db.commit()
        print(f"\n✅ {count} dépenses recatégorisées")
        return 0

    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        db.rollback()
        return 1
    finally:
        db.close()

if __name__ == '__main__':
    sys.exit(recategorize_kerbio())
