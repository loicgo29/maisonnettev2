#!/usr/bin/env python3
"""Dégèle la période Mai - Juillet 2026."""

from app.database import SessionLocal
from app.models.period import Period
from datetime import date

def unfreeze_may_july():
    db = SessionLocal()
    try:
        # Trouve la période Mai - Juillet 2026
        period = db.query(Period).filter(
            Period.start_date == date(2026, 5, 24),
            Period.end_date == date(2026, 7, 11)
        ).first()

        if not period:
            print("❌ Période not found")
            return

        print(f"📅 Période trouvée: {period.name}")
        print(f"   Statut: {period.status}")

        # Dégèle la période
        period.status = "draft"
        period.frozen_at = None
        db.commit()

        # Dégèle aussi toutes les dépenses de cette période
        from app.models.expense import Expense
        expenses = db.query(Expense).filter(
            Expense.period_id == period.id,
            Expense.status == "frozen"
        ).all()

        print(f"📌 Dépenses gelées: {len(expenses)}")
        for expense in expenses:
            expense.status = "draft"

        db.commit()
        print(f"\n✅ Période dégélée: {period.name}")
        print(f"   Statut: {period.status}")
        print(f"   Dépenses: {len(expenses)} ont été dégélées")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    unfreeze_may_july()
