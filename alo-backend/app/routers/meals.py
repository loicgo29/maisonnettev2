from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.meal import MealRecord
from app.schemas.meal import MealRecordCreate, MealRecordUpdate, MealRecordResponse, MealDayResponse


router = APIRouter(prefix="/api/meals", tags=["meals"])

ACCOUNTS = {
    "gourmich": ["Loïc", "Alban", "Mahaut", "Ilan"],
    "tigresse": ["Alice", "Adèle", "Oscar", "Albert", "Joséphine"]
}

DEFAULT_REPAS = {
    "gourmich": {"Loïc": 3, "Alban": 0, "Mahaut": 0, "Ilan": 0},
    "tigresse": {"Alice": 3, "Adèle": 3, "Oscar": 0, "Albert": 0, "Joséphine": 0}
}


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


def get_gourmich_default_meals(year: int, month: int, day: int) -> dict:
    """
    Calcule les repas par défaut pour Gourmich depuis 2026-05-24:
    - Loïc: 3 repas tous les jours
    - Ilan & Mahaut:
      * Semaine impaire: lundi=2, autres=3
      * Semaine paire: lundi=1, autres=0
    """
    weekday = get_weekday_number(year, month, day)
    is_monday = weekday == 1
    is_odd_week_val = is_odd_week(year, month, day)

    # Loïc: toujours 3 repas
    loic_meals = 3

    # Ilan & Mahaut: pattern selon semaine et jour
    if is_odd_week_val:
        # Semaine impaire
        others_meals = 2 if is_monday else 3
    else:
        # Semaine paire
        others_meals = 1 if is_monday else 0

    return {"Loïc": loic_meals, "Alban": 0, "Mahaut": others_meals, "Ilan": others_meals}


def get_default_meals_for_day(year: int, month: int, day: int, account: str) -> dict:
    """Retourne les repas par défaut pour un jour donné."""
    if account == "gourmich":
        return get_gourmich_default_meals(year, month, day)
    else:
        return DEFAULT_REPAS.get(account, {})


@router.get("/month/{year}/{month}/{account}")
async def get_month(year: int, month: int, account: str, db: Session = Depends(get_db)):
    """Récupère tous les repas d'un mois pour un compte"""
    if account not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="Account invalide")
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Mois invalide")

    # Obtenir tous les jours du mois
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    result = {}
    for day in range(1, days_in_month + 1):
        records = db.query(MealRecord).filter(
            MealRecord.year == year,
            MealRecord.month == month,
            MealRecord.day == day,
            MealRecord.account == account
        ).all()

        meals = {}
        default_meals = get_default_meals_for_day(year, month, day, account)
        for person in ACCOUNTS[account]:
            record = next((r for r in records if r.person == person), None)
            if record:
                meals[person] = record.repas
            else:
                meals[person] = default_meals.get(person, 0)

        result[day] = meals

    return result


@router.get("/day/{year}/{month}/{day}/{account}")
async def get_day(year: int, month: int, day: int, account: str, db: Session = Depends(get_db)):
    """Récupère les repas d'un jour spécifique"""
    if account not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="Account invalide")

    records = db.query(MealRecord).filter(
        MealRecord.year == year,
        MealRecord.month == month,
        MealRecord.day == day,
        MealRecord.account == account
    ).all()

    meals = {}
    default_meals = get_default_meals_for_day(year, month, day, account)
    for person in ACCOUNTS[account]:
        record = next((r for r in records if r.person == person), None)
        meals[person] = record.repas if record else default_meals.get(person, 0)

    return {
        "year": year,
        "month": month,
        "day": day,
        "account": account,
        "meals": meals
    }


@router.post("/record")
async def create_meal(meal: MealRecordCreate, db: Session = Depends(get_db)):
    """Crée ou met à jour un enregistrement de repas"""
    if meal.account not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="Account invalide")
    if meal.person not in ACCOUNTS[meal.account]:
        raise HTTPException(status_code=400, detail="Personne non trouvée dans ce compte")

    # Chercher si l'enregistrement existe
    existing = db.query(MealRecord).filter(
        MealRecord.year == meal.year,
        MealRecord.month == meal.month,
        MealRecord.day == meal.day,
        MealRecord.account == meal.account,
        MealRecord.person == meal.person
    ).first()

    if existing:
        existing.repas = meal.repas
        db.commit()
        return MealRecordResponse.from_orm(existing)
    else:
        db_meal = MealRecord(**meal.dict())
        db.add(db_meal)
        db.commit()
        db.refresh(db_meal)
        return MealRecordResponse.from_orm(db_meal)


@router.put("/record/{record_id}")
async def update_meal(record_id: int, meal: MealRecordUpdate, db: Session = Depends(get_db)):
    """Met à jour un enregistrement de repas"""
    db_meal = db.query(MealRecord).filter(MealRecord.id == record_id).first()
    if not db_meal:
        raise HTTPException(status_code=404, detail="Enregistrement non trouvé")

    db_meal.repas = meal.repas
    db.commit()
    db.refresh(db_meal)
    return MealRecordResponse.from_orm(db_meal)


@router.delete("/record/{record_id}")
async def delete_meal(record_id: int, db: Session = Depends(get_db)):
    """Supprime un enregistrement de repas"""
    db_meal = db.query(MealRecord).filter(MealRecord.id == record_id).first()
    if not db_meal:
        raise HTTPException(status_code=404, detail="Enregistrement non trouvé")

    db.delete(db_meal)
    db.commit()
    return {"detail": "Supprimé"}


@router.get("/summary/{year}/{month}")
async def get_summary(year: int, month: int, db: Session = Depends(get_db)):
    """Récupère le résumé des repas pour un mois entier"""
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    summary = {}
    for account in ACCOUNTS:
        summary[account] = {}
        for person in ACCOUNTS[account]:
            total = db.query(MealRecord).filter(
                MealRecord.year == year,
                MealRecord.month == month,
                MealRecord.account == account,
                MealRecord.person == person
            ).all()
            summary[account][person] = sum(r.repas for r in total)

    return {
        "year": year,
        "month": month,
        "summary": summary
    }


@router.get("/range/{start_date}/{end_date}/{account}")
async def get_range(start_date: str, end_date: str, account: str, db: Session = Depends(get_db)):
    """Récupère tous les repas entre deux dates pour un compte (format: YYYY-MM-DD)"""
    from datetime import datetime

    if account not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="Account invalide")

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD)")

    if start > end:
        raise HTTPException(status_code=400, detail="La date de début doit être antérieure à la date de fin")

    # Récupérer tous les repas dans la plage
    records = db.query(MealRecord).filter(
        MealRecord.year * 10000 + MealRecord.month * 100 + MealRecord.day >= start.year * 10000 + start.month * 100 + start.day,
        MealRecord.year * 10000 + MealRecord.month * 100 + MealRecord.day <= end.year * 10000 + end.month * 100 + end.day,
        MealRecord.account == account
    ).all()

    # Construire le résultat: {YYYY-MM-DD: {person: count}}
    result = {}

    # Générer tous les jours de la période
    current = start
    from datetime import timedelta
    while current <= end:
        year, month, day = current.year, current.month, current.day
        meals = {}
        default_meals = get_default_meals_for_day(year, month, day, account)

        for person in ACCOUNTS[account]:
            record = next((r for r in records if r.year == year and r.month == month and r.day == day and r.person == person), None)
            meals[person] = record.repas if record else default_meals.get(person, 0)

        date_str = current.strftime("%Y-%m-%d")
        result[date_str] = meals

        current += timedelta(days=1)

    return result


@router.post("/import-excel")
async def import_excel(file: UploadFile, db: Session = Depends(get_db)):
    """Importe les repas depuis un fichier Excel (format: Date, Compte, Personne, Repas)"""
    try:
        import openpyxl
    except ImportError:
        raise HTTPException(status_code=500, detail="openpyxl n'est pas installé")

    try:
        from openpyxl import load_workbook
        from io import BytesIO

        # Lire le fichier Excel
        contents = await file.read()
        wb = load_workbook(BytesIO(contents))
        ws = wb.active

        imported = 0
        errors = []

        # Parser les lignes (sauter l'en-tête)
        for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not row[0]:  # Arrêter à la fin des données
                break

            try:
                date_val, account, person, repas_count = row[0], row[1], row[2], row[3]

                # Valider les données
                if not date_val or not account or not person or repas_count is None:
                    errors.append(f"Ligne {row_idx}: Données incomplètes")
                    continue

                # Parser la date
                from datetime import datetime as dt
                if isinstance(date_val, str):
                    meal_date = dt.strptime(date_val, "%Y-%m-%d").date()
                else:
                    meal_date = date_val

                # Valider le compte
                if account not in ACCOUNTS:
                    errors.append(f"Ligne {row_idx}: Compte invalide '{account}'")
                    continue

                # Valider la personne
                if person not in ACCOUNTS[account]:
                    errors.append(f"Ligne {row_idx}: Personne '{person}' non valide pour le compte '{account}'")
                    continue

                # Valider le nombre de repas
                try:
                    repas_int = int(repas_count)
                    if repas_int < 0 or repas_int > 4:
                        errors.append(f"Ligne {row_idx}: Le nombre de repas doit être entre 0 et 4")
                        continue
                except (ValueError, TypeError):
                    errors.append(f"Ligne {row_idx}: Le nombre de repas doit être un entier")
                    continue

                # Chercher ou créer l'enregistrement
                existing = db.query(MealRecord).filter(
                    MealRecord.year == meal_date.year,
                    MealRecord.month == meal_date.month,
                    MealRecord.day == meal_date.day,
                    MealRecord.account == account,
                    MealRecord.person == person
                ).first()

                if existing:
                    existing.repas = repas_int
                else:
                    new_record = MealRecord(
                        year=meal_date.year,
                        month=meal_date.month,
                        day=meal_date.day,
                        account=account,
                        person=person,
                        repas=repas_int
                    )
                    db.add(new_record)

                imported += 1

            except Exception as e:
                errors.append(f"Ligne {row_idx}: {str(e)}")

        db.commit()

        return {
            "imported": imported,
            "errors": errors,
            "status": "success" if imported > 0 else "no_data"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'import: {str(e)}")
