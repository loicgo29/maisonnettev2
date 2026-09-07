#!/usr/bin/env python3
"""Dédoublonne et recatégorise les dépenses Telegram."""

from app.database import SessionLocal
from app.models.expense import Expense
from app.models.sharing import SharingEntry
from app.services.categorizer import Categorizer
from app.services.sharing_calculator import SharingCalculator
from datetime import date
from decimal import Decimal

def cleanup_and_recategorize():
    db = SessionLocal()
    categorizer = Categorizer()
    calculator = SharingCalculator()

    try:
        print("🔍 Analyse des doublons Telegram...\n")

        # Récupère toutes les dépenses Telegram
        all_telegram = db.query(Expense).filter(
            Expense.source == "telegram"
        ).order_by(Expense.date, Expense.created_at).all()

        print(f"Total dépenses Telegram: {len(all_telegram)}\n")

        # Groupe par (date, amount, label) pour détecter doublons
        from collections import defaultdict
        groups = defaultdict(list)

        for exp in all_telegram:
            key = (str(exp.date), str(exp.amount), exp.label)
            groups[key].append(exp)

        # Identifie les doublons
        duplicates_to_delete = []
        expenses_to_recategorize = []

        for key, exps in groups.items():
            if len(exps) > 1:
                print(f"🔴 Doublon: {key[0]} | {key[2]} | {key[1]}€ ({len(exps)} copies)")
                # Garde la première, supprime les autres
                for dup in exps[1:]:
                    duplicates_to_delete.append(dup.id)
                    print(f"  ❌ Suppression ID={dup.id}")
                # Recatégorise la première
                expenses_to_recategorize.append(exps[0])
            else:
                # Même les non-doublons doivent être recatégorisés
                expenses_to_recategorize.append(exps[0])

        print(f"\n📊 Résumé:")
        print(f"  Doublons à supprimer: {len(duplicates_to_delete)}")
        print(f"  Dépenses à recatégoriser: {len(expenses_to_recategorize)}\n")

        # Supprime les doublons
        if duplicates_to_delete:
            print("🗑️  Suppression des doublons...\n")
            for exp_id in duplicates_to_delete:
                # Supprime les sharing entries
                db.query(SharingEntry).filter(
                    SharingEntry.expense_id == exp_id
                ).delete()
                # Supprime la dépense
                exp = db.query(Expense).filter(Expense.id == exp_id).first()
                if exp:
                    db.delete(exp)
            db.commit()
            print(f"✅ {len(duplicates_to_delete)} doublons supprimés\n")

        # Recatégorise toutes les dépenses restantes
        print("🔄 Recatégorisation des dépenses...\n")
        recategorized_count = 0

        for exp in expenses_to_recategorize:
            # Catégorise le label
            yaml_category = categorizer.categorize(exp.label)

            # Mappe vers le modèle
            mapping = {
                "alimentation": "50/50",
                "logement": "50/50",
                "enfants": "50/50",
                "transport": "50/50",
                "loisirs": "50/50",
                "sante": "50/50",
                "brico": "brico",
                "divers": "divers",
            }
            new_category = mapping.get(yaml_category, "divers")

            if exp.category != new_category:
                print(f"  {exp.date} | {exp.label[:30]:<30} | {exp.category:>10} → {new_category:>10}")
                exp.category = new_category
                recategorized_count += 1

                # Recalcule le partage avec la nouvelle catégorie
                db.query(SharingEntry).filter(
                    SharingEntry.expense_id == exp.id
                ).delete()

                sharing_entries = calculator.calculate_sharing(exp, db)
                for entry in sharing_entries:
                    db.add(entry)

        db.commit()

        print(f"\n✅ {recategorized_count} dépenses recatégorisées")
        print(f"\n🎉 Nettoyage terminé!")

        # Résumé final
        remaining = db.query(Expense).filter(
            Expense.source == "telegram"
        ).count()

        print(f"\nDépenses Telegram restantes: {remaining}")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_and_recategorize()
