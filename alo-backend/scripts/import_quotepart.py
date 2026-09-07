#!/usr/bin/env python3
"""Script to import meal records from quotepart CSV."""

import sys
import csv
from datetime import datetime
from decimal import Decimal
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import MealRecord


def parse_french_date(date_str: str):
    """Parse French date strings like 'samedi 3 janv. 2026'."""
    months_map = {
        'janv': 1, 'janvier': 1,
        'févr': 2, 'février': 2, 'fev': 2, 'fevrier': 2,
        'mars': 3,
        'avr': 4, 'avril': 4,
        'mai': 5,
        'juin': 6,
        'juil': 7, 'juillet': 7,
        'août': 8, 'aout': 8,
        'sept': 9, 'septembre': 9,
        'oct': 10, 'octobre': 10,
        'nov': 11, 'novembre': 11,
        'déc': 12, 'décembre': 12, 'dec': 12, 'december': 12
    }

    date_str = ' '.join(date_str.split())
    day_names = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

    for day in day_names:
        date_str = date_str.replace(day + ' ', '').replace(day, '')

    date_str = date_str.strip()
    parts = date_str.split()

    if len(parts) >= 3:
        try:
            day = int(parts[0])
            month_str = parts[1].lower().replace('.', '')
            year = int(parts[2])

            for key, month_num in months_map.items():
                if month_str == key or month_str.startswith(key):
                    return datetime(year, month_num, day).date()
        except (ValueError, IndexError):
            pass

    return None


def get_meal_value(row: list, col_idx: int) -> float:
    """Extract meal value from CSV cell."""
    if col_idx >= len(row) or not row[col_idx]:
        return 0.0

    val = row[col_idx].strip()
    if not val or val == '#REF!':
        return 0.0

    val = val.replace(',', '.')

    try:
        return float(val)
    except ValueError:
        return 0.0


def import_csv(filepath: str):
    """Import meal records from CSV file."""
    # Maps person name to account name
    person_to_account = {
        "Loïc": "gourmich", "Loic": "gourmich", "Alban": "gourmich", "Mahaut": "gourmich", "Ilan": "gourmich",
        "Alice": "tigresse", "Adèle": "tigresse", "Adele": "tigresse", "Oscar": "tigresse", "Albert": "tigresse", "José": "tigresse", "Jose": "tigresse",
    }

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    if len(rows) < 3:
        print("❌ CSV must have at least 3 rows")
        return

    # Parse persons from row 1
    person_row = rows[0]
    persons = {idx: name.strip() for idx, name in enumerate(person_row) if name and name.strip()}

    db = SessionLocal()
    imported = 0
    errors = 0

    # Import from row 3 onwards
    for row_idx in range(2, len(rows)):
        row = rows[row_idx]

        if not row or not row[1]:
            continue

        date_str = row[1].strip()
        date_obj = parse_french_date(date_str)

        if not date_obj:
            print(f"⚠️  Row {row_idx + 1}: Could not parse date '{date_str}'")
            errors += 1
            continue

        for col_idx, person_name in persons.items():
            if person_name not in person_to_account:
                continue

            account_name = person_to_account[person_name]
            matin_val = get_meal_value(row, col_idx)
            midi_val = get_meal_value(row, col_idx + 1)
            soir_val = get_meal_value(row, col_idx + 2)
            total_meals = int(round(matin_val + midi_val + soir_val))

            if total_meals == 0:
                continue

            existing = db.query(MealRecord).filter(
                MealRecord.year == date_obj.year,
                MealRecord.month == date_obj.month,
                MealRecord.day == date_obj.day,
                MealRecord.account == account_name,
                MealRecord.person == person_name
            ).first()

            if existing:
                existing.repas = total_meals
            else:
                meal = MealRecord(
                    year=date_obj.year,
                    month=date_obj.month,
                    day=date_obj.day,
                    account=account_name,
                    person=person_name,
                    repas=total_meals
                )
                db.add(meal)

            imported += 1

    db.commit()
    db.close()

    print(f"✅ Imported {imported} meal records ({errors} errors)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_quotepart.py <filepath>")
        sys.exit(1)

    filepath = sys.argv[1]
    if not Path(filepath).exists():
        print(f"❌ File not found: {filepath}")
        sys.exit(1)

    import_csv(filepath)
