"""
Endpoints pour la page d'import UI (preview + dédoublonnage + confirmation)
"""
from fastapi import APIRouter, UploadFile, File, Query
from datetime import date
from typing import List, Optional
from app.models import Expense
from app.database import SessionLocal
from sqlalchemy import select

router = APIRouter(prefix="/imports", tags=["imports-ui"])


class ExpensePreview:
    """Modèle pour la prévisualisation"""
    def __init__(self, date: str, label: str, amount: str, category: str, source: str, account_id: int):
        self.date = date
        self.label = label
        self.amount = amount
        self.category = category
        self.source = source
        self.account_id = account_id


@router.get("/telegram/preview")
async def telegram_preview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Exporte un aperçu des données Telegram (prévisualisation avant import)
    """
    # TODO: Intégrer avec le script d'import Telegram
    # Pour l'instant, retourne un exemple
    return [
        {
            "date": "2026-06-05",
            "label": "Carrefour",
            "amount": "47.50",
            "category": "quotepart",
            "source": "telegram",
            "account_id": 1,
        }
    ]


@router.post("/csv/preview")
async def csv_preview(file: UploadFile = File(...)):
    """
    Exporte un aperçu des données CSV Fortuneo (prévisualisation avant import)
    """
    # TODO: Parser le CSV et retourner l'aperçu
    content = await file.read()
    # Parse CSV et retourne aperçu
    return []


@router.post("/deduplicate")
async def deduplicate(data: dict):
    """
    Dédoublonne les dépenses en se basant sur (date, montant, label)
    """
    expenses = data.get("expenses", [])

    # Crée un dictionnaire pour tracker les doublons
    seen = {}
    deduped = []
    duplicate_count = 0

    for expense in expenses:
        key = (expense["date"], expense["amount"], expense["label"])
        if key not in seen:
            seen[key] = True
            deduped.append(expense)
        else:
            duplicate_count += 1

    return {
        "deduped": deduped,
        "duplicate_count": duplicate_count,
    }


@router.post("/confirm")
async def confirm_import(data: dict):
    """
    Valide et crée les dépenses en base de données
    """
    source = data.get("source")
    expenses = data.get("expenses", [])

    db = SessionLocal()
    created_count = 0

    try:
        for expense in expenses:
            # Crée une dépense
            new_expense = Expense(
                date=expense["date"],
                label=expense["label"],
                amount=expense["amount"],
                category=expense.get("category", "divers"),
                source=source,
                account_id=expense.get("account_id", 1),
                status="draft",
            )
            db.add(new_expense)
            created_count += 1

        db.commit()
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()

    return {
        "created": created_count,
        "skipped": len(expenses) - created_count,
    }
