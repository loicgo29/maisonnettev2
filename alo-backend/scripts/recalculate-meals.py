#!/usr/bin/env python3
"""Recalcule les repas de Loïc depuis 2026-05-22 selon le nouveau pattern."""

import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.meal import MealRecord

def get_week_number(year: int, month: int, day: int) -> int:
    """Calcule le numéro de semaine ISO."""
    d = date(year, month, day)
    return d.isocalendar()[1]

def is_odd_week(year: int, month: int, day: int) -> bool:
    """Retourne True si c'est une semaine impaire."""
    week_num = get_week_number(year, month, day)
    return week_num % 2 == 1

def get_weekday_number(year: int, month: int, day: int) -> int:
    """Retourne le numéro du jour de la semaine (1=lundi, 7=dimanche)."""
    d = date(year, month, day)
    return d.isoweekday()

def get_loic_meals(year: int, month: int, day: int) -> int:
    """Calcule les repas pour Loïc selon le pattern."""
    weekday = get_weekday_number(year, month, day)
    is_monday = weekday == 1
    is_odd_week_val = is_odd_week(year, month, day)

    if is_monday and is_odd_week_val:
        return 2
    elif is_monday and not is_odd_week_val:
        return 1
    else:
        return 3

def recalculate_meals():
    """Recalcule tous les repas de Loïc depuis 2026-05-24."""
    db = SessionLocal()
    start_date = date(2026, 5, 24)

    try:
        # Récupère tous les repas de Loïc depuis la date
        records = db.query(MealRecord).filter(
            MealRecord.person == "Loïc",
            MealRecord.account == "gourmich",
            MealRecord.year >= 2026,
            MealRecord.month >= 5,
            ((MealRecord.year == 2026 and MealRecord.month == 5 and MealRecord.day >= 24) or
             (MealRecord.year == 2026 and MealRecord.month > 5) or
             MealRecord.year > 2026)
        ).all()

        print(f"🔄 Recalcul de {len(records)} repas de Loïc...\n")

        count_changed = 0
        for record in records:
            current_year = record.year
            current_month = record.month
            current_day = record.day

            new_meals = get_loic_meals(current_year, current_month, current_day)
            old_meals = record.repas

            if old_meals != new_meals:
                record.repas = new_meals
                count_changed += 1
                d = date(current_year, current_month, current_day)
                weekday_name = d.strftime("%A")
                week_num = get_week_number(current_year, current_month, current_day)
                parity = "impaire" if is_odd_week(current_year, current_month, current_day) else "paire"
                print(f"  {d} ({weekday_name}, sem {week_num} {parity:7}) | {old_meals} → {new_meals}")

        db.commit()
        print(f"\n✅ {count_changed} repas recalculés")
        return 0

    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        db.rollback()
        return 1
    finally:
        db.close()

if __name__ == '__main__':
    sys.exit(recalculate_meals())
