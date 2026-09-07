#!/usr/bin/env python3
"""Export meals and expenses to CSV files."""

import sys
import csv
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import MealRecord, Expense


def export_meals(output_file: str):
    """Export all meal records to CSV."""
    db = SessionLocal()
    meals = db.query(MealRecord).order_by(
        MealRecord.year, MealRecord.month, MealRecord.day, MealRecord.account
    ).all()

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Date', 'Compte', 'Personne', 'Repas'])

        for meal in meals:
            date = f"{meal.year}-{meal.month:02d}-{meal.day:02d}"
            writer.writerow([date, meal.account, meal.person, meal.repas])

    db.close()
    print(f"✅ Exported {len(meals)} meal records to {output_file}")


def export_expenses(output_file: str):
    """Export all expenses to CSV."""
    db = SessionLocal()
    expenses = db.query(Expense).order_by(Expense.date.desc()).all()

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'ID', 'Date', 'Libellé', 'Montant', 'Compte', 'Catégorie',
            'Source', 'Statut', 'Ventilation', 'Commentaire', 'Créé', 'Modifié'
        ])

        for exp in expenses:
            account_name = {1: 'Loïc', 2: 'Alice', 3: 'CC', 5: 'Fortuneo'}.get(
                exp.account_id, f'Account {exp.account_id}'
            )
            writer.writerow([
                exp.id,
                exp.date,
                exp.label,
                float(exp.amount),
                account_name,
                exp.category or '',
                exp.source or '',
                exp.status or '',
                exp.sharing_mode or '',
                exp.comment or '',
                exp.created_at.isoformat() if exp.created_at else '',
                exp.updated_at.isoformat() if exp.updated_at else ''
            ])

    db.close()
    print(f"✅ Exported {len(expenses)} expenses to {output_file}")


if __name__ == "__main__":
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    meals_file = f"repas_export_{timestamp}.csv"
    expenses_file = f"depenses_export_{timestamp}.csv"

    export_meals(meals_file)
    export_expenses(expenses_file)

    print(f"\n📁 Files created:")
    print(f"   - {meals_file}")
    print(f"   - {expenses_file}")
