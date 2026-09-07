#!/usr/bin/env python3
"""Recatégorise les dépenses 'divers' selon le Categorizer."""

from app.database import SessionLocal
from app.models.expense import Expense
from app.models.sharing import SharingEntry
from app.services.categorizer import Categorizer
from app.services.sharing_calculator import SharingCalculator

def recategorize_divers():
    db = SessionLocal()
    categorizer = Categorizer()
    calculator = SharingCalculator()

    try:
        # Récupère toutes les dépenses "divers"
        divers_expenses = db.query(Expense).filter(
            Expense.category == "divers"
        ).all()

        print(f"🔍 Dépenses 'divers' trouvées: {len(divers_expenses)}\n")

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

        for exp in divers_expenses:
            # Catégorise le label
            yaml_category = categorizer.categorize(exp.label)
            new_category = mapping.get(yaml_category, "divers")

            if new_category != "divers":
                print(f"  ✅ {exp.date} | {exp.label[:40]:<40} | divers → {new_category}")
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
        print(f"  Restent 'divers': {unchanged}")
        print(f"\n✅ Recatégorisation terminée!")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    recategorize_divers()
