from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List, Any
from app.database import get_db
from app.models import Expense, Period, SharingEntry
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.services.sharing_calculator import SharingCalculator
from app.services.telegram_classifier import auto_classify

router = APIRouter()
calculator = SharingCalculator()


@router.put("/{expense_id}/debug")
async def debug_update(expense_id: int, data: Any = Body(...)):
    """Debug endpoint to see what data is being sent."""
    return {"received": data, "type": str(type(data))}


@router.post("", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    expense: ExpenseCreate, db: Session = Depends(get_db)
):
    """Create a new expense (draft status)."""
    # Auto-classify Telegram expenses by keywords
    sharing_mode = None
    if expense.source == "telegram":
        sharing_mode = auto_classify(expense.label)

    db_expense = Expense(
        date=expense.date,
        amount=expense.amount,
        label=expense.label,
        category=expense.category,
        source=expense.source,
        comment=expense.comment,
        account_id=expense.account_id,
        status="draft",
        sharing_mode=sharing_mode,
    )
    db.add(db_expense)
    db.flush()

    # Calculate initial sharing (50/50 by default)
    sharing_entries = calculator.calculate_sharing(db_expense, db)
    for entry in sharing_entries:
        db.add(entry)

    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.get("", response_model=List[ExpenseResponse])
async def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    status: Optional[str] = None,
    period_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """List expenses with optional filters."""
    query = db.query(Expense)

    if category:
        query = query.filter(Expense.category == category)
    if status:
        query = query.filter(Expense.status == status)
    if period_id:
        query = query.filter(Expense.period_id == period_id)

    expenses = query.order_by(Expense.date.desc()).offset(skip).limit(limit).all()
    return expenses


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """Get a specific expense."""
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    db: Session = Depends(get_db),
):
    """Update an expense (only if draft)."""
    try:
        print(f"[DEBUG] update_expense: id={expense_id}, data={expense_update.model_dump(exclude_unset=True)}")

        db_expense = db.get(Expense, expense_id)
        if not db_expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        if db_expense.status == "frozen":
            raise HTTPException(
                status_code=409, detail="Cannot modify a frozen expense"
            )

        update_data = expense_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_expense, field, value)

        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense
    except Exception as e:
        print(f"[ERROR] update_expense error: {type(e).__name__}: {str(e)}")
        raise


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """Delete an expense (only if draft)."""
    db_expense = db.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if db_expense.status == "frozen":
        raise HTTPException(
            status_code=409, detail="Cannot delete a frozen expense"
        )

    db.delete(db_expense)
    db.commit()
    return None


@router.post("/{expense_id}/recalculate", response_model=ExpenseResponse)
async def recalculate_expense(
    expense_id: int, db: Session = Depends(get_db)
):
    """Recalculate sharing for an expense."""
    db_expense = db.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if db_expense.status == "frozen":
        raise HTTPException(
            status_code=409, detail="Cannot recalculate a frozen expense"
        )

    # Delete old entries and recalculate
    db.query(SharingEntry).filter(
        SharingEntry.expense_id == expense_id,
        SharingEntry.is_manual_override == False,
    ).delete()

    new_entries = calculator.calculate_sharing(db_expense, db)
    for entry in new_entries:
        db.add(entry)

    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.post("/{expense_id}/learn-category", response_model=ExpenseResponse)
async def learn_category(
    expense_id: int,
    category: dict,
    db: Session = Depends(get_db)
):
    """
    Corrige la catégorie d'une dépense ET mémorise l'association label→catégorie.

    Body: {"category": "quotepart"}
    """
    from app.services.label_learner import save_rule

    db_expense = db.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if db_expense.status == "frozen":
        raise HTTPException(status_code=409, detail="Cannot modify a frozen expense")

    new_category = category.get("category")
    if not new_category:
        raise HTTPException(status_code=400, detail="Missing 'category' field")

    # Mettre à jour la catégorie
    db_expense.category = new_category

    # Mémoriser l'association label → catégorie
    save_rule(db_expense.label, new_category)

    db.commit()
    db.refresh(db_expense)
    return db_expense
