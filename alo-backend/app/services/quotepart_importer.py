"""Import quote-part (meal records) from CSV."""

import csv
import re
from io import StringIO
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import MealRecord


def parse_quotepart_csv(content: str, db: Session) -> dict:
    """
    Parse quote-part CSV and create/update MealRecord entries.

    CSV structure:
    - Row 1: Person names
    - Row 2: Meal types (Matin, Midi, Soir)
    - Rows 3+: Date + meal values

    Returns: {'imported': count, 'errors': []}
    """
    reader = csv.reader(StringIO(content))
    rows = list(reader)

    if len(rows) < 3:
        raise ValueError("CSV must have at least 3 rows (names, headers, data)")

    # Parse person names from row 1
    person_row = rows[0]
    persons = {}  # {col_index: person_name}

    for idx, name in enumerate(person_row):
        if name and name.strip():
            persons[idx] = name.strip()

    # Parse meal types from row 2
    meal_types = []
    for idx in range(len(rows[1])):
        meal_types.append(rows[1][idx].strip() if idx < len(rows[1]) else "")

    # Account mapping
    account_mapping = {
        "Loïc": 1, "Loic": 1,
        "Alban": 1,
        "Mahaut": 1,
        "Ilan": 1,
        "Alice": 2,
        "Adèle": 2, "Adele": 2,
        "Oscar": 2,
        "Albert": 2,
        "José": 2, "Jose": 2,
    }

    imported = 0
    errors = []

    # Import meal records from row 3 onwards
    for row_idx in range(2, len(rows)):
        row = rows[row_idx]

        if not row or not row[1]:
            continue  # Skip empty rows

        # Parse date (column 2)
        date_str = row[1].strip()
        try:
            # Handle various French date formats: "samedi 3 janv. 2026", "3 janvier 2026", etc.
            date_obj = parse_french_date(date_str)
            if not date_obj:
                errors.append(f"Row {row_idx + 1}: Could not parse date '{date_str}'")
                continue
        except Exception as e:
            errors.append(f"Row {row_idx + 1}: Date error '{date_str}' - {str(e)}")
            continue

        # For each person, extract and sum their meal values
        for col_idx, person_name in persons.items():
            if person_name not in account_mapping:
                continue  # Skip unknown persons

            account_id = account_mapping[person_name]

            # Get Matin, Midi, Soir columns for this person
            matin_col = col_idx
            midi_col = col_idx + 1
            soir_col = col_idx + 2

            # Extract values
            matin_val = get_meal_value(row, matin_col)
            midi_val = get_meal_value(row, midi_col)
            soir_val = get_meal_value(row, soir_col)

            # Sum meals for the day
            total_meals = matin_val + midi_val + soir_val

            if total_meals == 0:
                continue  # Skip zero meals

            # Create/update MealRecord
            existing = db.query(MealRecord).filter(
                MealRecord.year == date_obj.year,
                MealRecord.month == date_obj.month,
                MealRecord.day == date_obj.day,
                MealRecord.account_id == account_id,
                MealRecord.person == person_name
            ).first()

            if existing:
                existing.repas = Decimal(str(total_meals))
            else:
                meal_record = MealRecord(
                    year=date_obj.year,
                    month=date_obj.month,
                    day=date_obj.day,
                    account_id=account_id,
                    person=person_name,
                    repas=Decimal(str(total_meals))
                )
                db.add(meal_record)

            imported += 1

    db.commit()

    return {
        "imported": imported,
        "errors": errors if errors else [],
        "message": f"Successfully imported {imported} meal records"
    }


def parse_french_date(date_str: str):
    """Parse French date strings like 'samedi 3 janv. 2026' or '3 janvier 2026'."""
    import locale
    from datetime import datetime

    # Remove extra spaces
    date_str = ' '.join(date_str.split())

    # French month abbreviations and full names
    months_abbr = {
        'janv': 1, 'jan': 1,
        'févr': 2, 'feb': 2, 'fev': 2,
        'mars': 3, 'mar': 3,
        'avr': 4, 'apr': 4,
        'mai': 5, 'may': 5,
        'juin': 6, 'jun': 6,
        'juil': 7, 'jul': 7,
        'août': 8, 'aou': 8, 'aug': 8,
        'sept': 9, 'sep': 9,
        'oct': 10,
        'nov': 11,
        'déc': 12, 'dec': 12,
    }

    months_full = {
        'janvier': 1, 'february': 2, 'février': 2, 'mars': 3,
        'april': 4, 'avril': 4, 'may': 5, 'mai': 5,
        'june': 6, 'juin': 6, 'july': 7, 'juillet': 7,
        'august': 8, 'août': 8, 'september': 9, 'septembre': 9,
        'october': 10, 'octobre': 10, 'november': 11, 'novembre': 11,
        'december': 12, 'décembre': 12,
    }

    # Remove day name if present (samedi, dimanche, etc.)
    day_names = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    for day in day_names:
        date_str = date_str.replace(day + ' ', '').replace(day, '')

    date_str = date_str.strip()

    # Try to extract day, month, year
    parts = date_str.split()

    if len(parts) >= 3:
        try:
            day = int(parts[0])
            month_str = parts[1].lower()
            year = int(parts[2])

            # Find month number
            month = None
            if month_str in months_abbr:
                month = months_abbr[month_str]
            elif month_str in months_full:
                month = months_full[month_str]

            if month:
                return datetime(year, month, day).date()
        except (ValueError, IndexError):
            pass

    return None


def get_meal_value(row: list, col_idx: int) -> float:
    """Extract meal value from CSV cell, handling French decimal separator."""
    if col_idx >= len(row) or not row[col_idx]:
        return 0.0

    val = row[col_idx].strip()
    if not val or val == '#REF!':
        return 0.0

    # Replace French decimal separator (,) with English (.)
    val = val.replace(',', '.')

    try:
        return float(val)
    except ValueError:
        return 0.0
