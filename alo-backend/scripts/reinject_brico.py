#!/usr/bin/env python3
"""Réinjecter les dépenses brico manquantes."""

import sys
from pathlib import Path
from datetime import date
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense

def reinject_brico():
    """Ajouter les 4 dépenses brico manquantes."""
    db = SessionLocal()

    expenses = [
        {
            'date': date(2026, 3, 28),
            'label': 'Leroy Merlin',
            'amount': Decimal('97'),
            'account_id': 1,
            'category': 'brico',
            'source': 'csv_import',
        },
        {
            'date': date(2026, 3, 28),
            'label': 'euros Leroy Merlin',
            'amount': Decimal('36.31'),
            'account_id': 1,
            'category': 'brico',
            'source': 'csv_import',
        },
        {
            'date': date(2026, 2, 16),
            'label': 'casto',
            'amount': Decimal('70'),
            'account_id': 2,
            'category': 'brico',
            'source': 'csv_import',
        },
        {
            'date': date(2026, 1, 18),
            'label': 'Leroy',
            'amount': Decimal('12'),
            'account_id': 2,
            'category': 'brico',
            'source': 'csv_import',
        },
    ]

    try:
        for exp_data in expenses:
            expense = Expense(
                date=exp_data['date'],
                label=exp_data['label'],
                amount=exp_data['amount'],
                account_id=exp_data['account_id'],
                category=exp_data['category'],
                source=exp_data['source'],
                status='draft',
            )
            db.add(expense)
            print(f"✅ {exp_data['date']} {exp_data['label']:30} {exp_data['amount']:8} ({('Loic' if exp_data['account_id'] == 1 else 'Alice')})")

        db.commit()
        print(f"\n✅ 4 dépenses brico réinjectées!")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reinject_brico()
