#!/usr/bin/env python3
"""Recatégorise toutes les dépenses à partir d'une date donnée."""

from app.database import SessionLocal
from app.models.expense import Expense
from app.models.sharing import SharingEntry
from app.services.categorizer import Categorizer
from app.services.sharing_calculator import SharingCalculator
from datetime import date

def recategorize_from_date(start_date_str="2026-05-22"):
    db = SessionLocal()
    categorizer = Categorizer()
    calculator = SharingCalculator()

    try:
        start_date = date.fromisoformat(start_date_str)

        # Récupère toutes les dépenses depuis la date
        expenses = db.query(Expense).filter(
            Expense.date >= start_date
        ).order_by(Expense.date).all()

        print(f"🔍 Dépenses depuis {start_date_str}: {len(expenses)}\n")

        mapping = {
            "alimentation": "50/50",
            "logement": "50/50",
            "enfants": "50/50",
            "transport": "50/50",
            "loisirs": "50/50",
            "sante": "50/50",
            "brico": "brico",
            "quotepart": "quotepart",
            "divers": "divers",
        }

        recategorized = 0
        unchanged = 0

        for exp in expenses:
            # Catégorise le label
            yaml_category = categorizer.categorize(exp.label)
            new_category = mapping.get(yaml_category, "divers")

            if new_category != exp.category:
                print(f"  ✅ {exp.date} | {exp.label[:40]:<40} | {exp.category:>10} → {new_category:>10}")
                exp.category = new_category
                recategorized += 1

                # Recalcule le partage avec la nouvelle catégorie
                db.query(SharingEntry).filter(
                    SharingEntry.expense_id == exp.id
                ).delete()

                sharing_entries = calculator.calculate_sharing(exp, db)
                for entry in sharing_entries:
                    db.add(entry)
            else:
                unchanged += 1

        db.commit()

        print(f"\n📊 Résumé:")
        print(f"  Recatégorisées: {recategorized}")
        print(f"  Inchangées: {unchanged}")
        print(f"\n✅ Recatégorisation terminée!")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    recategorize_from_date("2026-05-22")
