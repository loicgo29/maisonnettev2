"""API endpoints pour le moteur de rééquilibrage."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models import MealRecord, Expense, Period
from app.services.reequilibrage_calculator import calculate_reequilibrage

router = APIRouter(prefix="/api/reequilibrage", tags=["reequilibrage"])


@router.get("/{period_id}")
async def get_reequilibrage(period_id: int, db: Session = Depends(get_db)):
    """
    Calcule le rééquilibrage complet pour une période.

    Retourne : quote-part, charges théoriques, financement réel, solde final.
    """
    result = calculate_reequilibrage(period_id, db)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/{period_id}/meals")
async def get_period_meals(period_id: int, db: Session = Depends(get_db)):
    """
    Récupère tous les repas de la période.
    """
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail=f"Période {period_id} non trouvée")

    # Construire les dates en entiers pour comparaison (YYYYMMDD)
    start_int = period.start_date.year * 10000 + period.start_date.month * 100 + period.start_date.day
    end_int = period.end_date.year * 10000 + period.end_date.month * 100 + period.end_date.day

    # Filtre par plage de dates (YYYYMMDD)
    meals = db.query(MealRecord).filter(
        (MealRecord.year * 10000 + MealRecord.month * 100 + MealRecord.day).between(start_int, end_int)
    ).all()

    result = []
    for meal in meals:
        date_str = f"{meal.year}-{meal.month:02d}-{meal.day:02d}"
        result.append({
            "date": date_str,
            "account": meal.account,
            "person": meal.person,
            "repas": float(meal.repas)
        })

    return sorted(result, key=lambda x: x["date"], reverse=True)


@router.get("/brico/total")
async def get_brico_total(db: Session = Depends(get_db)):
    """
    Retourne le total cumulé de toutes les dépenses brico par compte.
    """
    from decimal import Decimal

    brico_expenses = db.query(Expense).filter(
        Expense.category == "brico"
    ).all()

    result = {
        "loic": 0.0,
        "alice": 0.0
    }

    for expense in brico_expenses:
        account_name = "loic" if expense.account_id == 1 else "alice"
        result[account_name] += float(expense.amount)

    return result


@router.get("/{period_id}/virements")
async def get_period_virements(period_id: int, db: Session = Depends(get_db)):
    """
    Récupère tous les virements (financement) de la période, groupés par compte.
    """
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail=f"Période {period_id} non trouvée")

    virements = db.query(Expense).filter(
        Expense.category == "virement",
        Expense.date >= period.start_date,
        Expense.date <= period.end_date,
        Expense.account_id.in_([1, 2])
    ).all()

    result = {
        "loic": [],
        "alice": []
    }

    for vir in virements:
        account_name = "loic" if vir.account_id == 1 else "alice"
        result[account_name].append({
            "date": str(vir.date),
            "label": vir.label,
            "amount": float(vir.amount),
            "source": vir.source
        })

    # Trier par date décroissante
    result["loic"] = sorted(result["loic"], key=lambda x: x["date"], reverse=True)
    result["alice"] = sorted(result["alice"], key=lambda x: x["date"], reverse=True)

    return result


@router.get("/{period_id}/riviere")
async def get_period_riviere(period_id: int, db: Session = Depends(get_db)):
    """
    Récupère TOUS les investissements Rivière = TOUS les brico payés par LOÏC depuis le début.
    """
    riviere_expenses = db.query(Expense).filter(
        Expense.account_id == 1,  # Loïc uniquement
        Expense.category == "brico"  # Bricolage uniquement (depuis le début, pas limité à la période)
    ).all()

    result = {
        "total": sum(float(e.amount) for e in riviere_expenses),
        "count": len(riviere_expenses)
    }

    return result


@router.get("/{period_id}/telegram")
async def get_period_telegram(period_id: int, db: Session = Depends(get_db)):
    """
    Récupère tous les paiements Telegram (source: telegram) de la période, groupés par compte.
    """
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail=f"Période {period_id} non trouvée")

    telegrams = db.query(Expense).filter(
        Expense.source == "telegram",
        Expense.date >= period.start_date,
        Expense.date <= period.end_date,
        Expense.account_id.in_([1, 2])
    ).all()

    result = {
        "loic": [],
        "alice": []
    }

    for msg in telegrams:
        account_name = "loic" if msg.account_id == 1 else "alice"
        result[account_name].append({
            "date": str(msg.date),
            "label": msg.label,
            "amount": float(msg.amount),
            "source": msg.source
        })

    # Trier par date décroissante
    result["loic"] = sorted(result["loic"], key=lambda x: x["date"], reverse=True)
    result["alice"] = sorted(result["alice"], key=lambda x: x["date"], reverse=True)

    return result


@router.get("/{period_id}/expenses/{category}")
async def get_period_expenses_by_category(period_id: int, category: str, db: Session = Depends(get_db)):
    """
    Récupère toutes les dépenses d'une catégorie pour une période donnée.
    Normalise "50" en "50/50" pour les catégories de partage.
    """
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail=f"Période {period_id} non trouvée")

    # Normaliser "50" en "50/50"
    normalized_category = "50/50" if category == "50" else category

    expenses = db.query(Expense).filter(
        Expense.category == normalized_category,
        Expense.date >= period.start_date,
        Expense.date <= period.end_date,
        Expense.account_id.in_([1, 2])  # Loïc (1) et Alice (2)
    ).all()

    result = {
        "category": normalized_category,
        "period": f"{period.start_date} → {period.end_date}",
        "loic": [],
        "alice": []
    }

    for exp in expenses:
        account_name = "loic" if exp.account_id == 1 else "alice"
        result[account_name].append({
            "date": str(exp.date),
            "label": exp.label,
            "amount": float(exp.amount),
            "source": exp.source,
            "comment": exp.comment or ""
        })

    # Trier par date décroissante
    result["loic"] = sorted(result["loic"], key=lambda x: x["date"], reverse=True)
    result["alice"] = sorted(result["alice"], key=lambda x: x["date"], reverse=True)

    return result
