#!/usr/bin/env python3
"""Déduplique les dépenses Telegram en juillet."""

from app.database import SessionLocal
from app.models.expense import Expense
from app.models.sharing import SharingEntry
from sqlalchemy import func, and_
from datetime import datetime, date

def deduplicate_july():
    db = SessionLocal()
    try:
        print("Recherche des doublons Telegram en juillet...")

        # Grouper par (date, amount, label) et compter
        duplicates = db.query(
            Expense.date,
            Expense.amount,
            Expense.label,
            func.count(Expense.id).label('count')
        ).filter(
            Expense.source == "telegram",
            Expense.date >= date(2026, 7, 1),
            Expense.date <= date(2026, 7, 31)
        ).group_by(
            Expense.date,
            Expense.amount,
            Expense.label
        ).having(
            func.count(Expense.id) > 1
        ).all()

        print(f"✅ Trouvé {len(duplicates)} groupes de doublons")

        total_deleted = 0

        for dup in duplicates:
            msg_date = dup.date
            amount = dup.amount
            label = dup.label
            count = dup.count

            print(f"\n📌 {msg_date} | {label} | {amount}€ | {count} copies")

            # Récupère tous les enregistrements doublons
            expenses = db.query(Expense).filter(
                Expense.date == msg_date,
                Expense.amount == amount,
                Expense.label == label,
                Expense.source == "telegram"
            ).order_by(Expense.created_at.desc()).all()

            # Garde le premier (plus récent), supprime les autres
            for i, expense in enumerate(expenses[1:], 1):
                print(f"  ❌ Suppression doublon #{i}: ID={expense.id}")

                # Supprime les sharing entries associées
                db.query(SharingEntry).filter(
                    SharingEntry.expense_id == expense.id
                ).delete()

                # Supprime la dépense
                db.delete(expense)
                total_deleted += 1

        db.commit()
        print(f"\n✅ Total supprimé: {total_deleted} doublons")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    deduplicate_july()
