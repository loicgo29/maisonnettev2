#!/usr/bin/env python3
"""Merge two person names in meal records."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import MealRecord


def merge_persons(source_name: str, target_name: str):
    """
    Merge all meal records from source_name into target_name.
    If both exist for the same date/account, sum the meals.
    """
    db = SessionLocal()

    # Find all records with source name
    source_meals = db.query(MealRecord).filter(
        MealRecord.person == source_name
    ).all()

    if not source_meals:
        print(f"❌ No records found for {source_name}")
        db.close()
        return

    merged = 0
    summed = 0

    for source_meal in source_meals:
        # Check if target person already has a record for this date/account
        existing = db.query(MealRecord).filter(
            MealRecord.year == source_meal.year,
            MealRecord.month == source_meal.month,
            MealRecord.day == source_meal.day,
            MealRecord.account == source_meal.account,
            MealRecord.person == target_name
        ).first()

        if existing:
            # Sum the meals
            existing.repas += source_meal.repas
            summed += 1
            # Delete source record
            db.delete(source_meal)
        else:
            # Rename to target
            source_meal.person = target_name
            merged += 1

    db.commit()
    db.close()

    print(f"✅ Merged {merged} records (renamed)")
    print(f"✅ Summed {summed} records (duplicates found and combined)")
    print(f"✅ Total: {merged + summed} records processed")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python merge_persons.py <source_name> <target_name>")
        print("Example: python merge_persons.py Adèle Adele")
        sys.exit(1)

    source = sys.argv[1]
    target = sys.argv[2]

    merge_persons(source, target)
