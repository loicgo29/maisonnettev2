#!/usr/bin/env python3
"""Copy meal records from one person to another."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import MealRecord


def copy_meals(source_person: str, target_person: str):
    """Copy all meal records from source_person to target_person."""
    db = SessionLocal()

    # Find all meal records for source person
    source_meals = db.query(MealRecord).filter(
        MealRecord.person == source_person
    ).all()

    if not source_meals:
        print(f"❌ No meal records found for {source_person}")
        db.close()
        return

    copied = 0

    for meal in source_meals:
        # Check if this person/date combination already exists
        existing = db.query(MealRecord).filter(
            MealRecord.year == meal.year,
            MealRecord.month == meal.month,
            MealRecord.day == meal.day,
            MealRecord.account == meal.account,
            MealRecord.person == target_person
        ).first()

        if existing:
            # Update if exists
            existing.repas = meal.repas
        else:
            # Create new record
            new_meal = MealRecord(
                year=meal.year,
                month=meal.month,
                day=meal.day,
                account=meal.account,
                person=target_person,
                repas=meal.repas
            )
            db.add(new_meal)

        copied += 1

    db.commit()
    db.close()

    print(f"✅ Copied {copied} meal records from {source_person} to {target_person}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python copy_meal_person.py <source_person> <target_person>")
        print("Example: python copy_meal_person.py Mahaut Ilan")
        sys.exit(1)

    source = sys.argv[1]
    target = sys.argv[2]

    copy_meals(source, target)
