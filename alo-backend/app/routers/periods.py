from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from pathlib import Path
from app.database import get_db
from app.models import Period, Expense
from app.schemas.period import PeriodCreate, PeriodUpdate, PeriodResponse, PeriodSummary
from app.services.sharing_calculator import SharingCalculator
from app.services.export_service import ExportService

router = APIRouter()
calculator = SharingCalculator()


@router.post("", response_model=PeriodResponse, status_code=201)
async def create_period(period: PeriodCreate, db: Session = Depends(get_db)):
    """Create a new period (draft status)."""
    db_period = Period(
        name=period.name,
        start_date=period.start_date,
        end_date=period.end_date,
        status="draft",
        notes=period.notes,
    )
    db.add(db_period)
    db.commit()
    db.refresh(db_period)
    return db_period


@router.get("", response_model=List[PeriodResponse])
async def list_periods(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all periods."""
    query = db.query(Period)
    if status:
        query = query.filter(Period.status == status)

    periods = query.order_by(Period.start_date.desc()).offset(skip).limit(limit).all()
    return periods


@router.get("/{period_id}/export")
async def export_period(period_id: int, db: Session = Depends(get_db)):
    """Export period as detailed Markdown file."""
    period = db.get(Period, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    # Générer le Markdown
    exporter = ExportService()
    markdown = exporter.generate_period_markdown(period_id, db)

    # Créer le répertoire export s'il n'existe pas
    export_dir = Path("/app/data/export")
    export_dir.mkdir(parents=True, exist_ok=True)

    # Sauvegarder le fichier
    filename = f"periode_{period_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    filepath = export_dir / filename

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(markdown)

    # Retourner le fichier en téléchargement
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="text/markdown; charset=utf-8"
    )


@router.get("/{period_id}", response_model=PeriodResponse)
async def get_period(period_id: int, db: Session = Depends(get_db)):
    """Get a specific period."""
    period = db.get(Period, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    return period


@router.get("/{period_id}/summary", response_model=PeriodSummary)
async def get_period_summary(period_id: int, db: Session = Depends(get_db)):
    """Get a period summary with totals and sharing breakdown."""
    period = db.get(Period, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    totals = calculator.get_period_summary(period_id, db)

    return {
        "id": period.id,
        "name": period.name,
        "start_date": period.start_date,
        "end_date": period.end_date,
        "status": period.status,
        "total_amount": totals["total"],
        "adulte1_total": totals["adulte1_total"],
        "adulte2_total": totals["adulte2_total"],
        "expense_count": len(period.expenses),
    }


@router.put("/{period_id}", response_model=PeriodResponse)
async def update_period(
    period_id: int,
    period_update: PeriodUpdate,
    db: Session = Depends(get_db),
):
    """Update a period (only if draft)."""
    db_period = db.get(Period, period_id)
    if not db_period:
        raise HTTPException(status_code=404, detail="Period not found")

    if db_period.status == "frozen":
        raise HTTPException(status_code=409, detail="Cannot modify a frozen period")

    update_data = period_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_period, field, value)

    db.add(db_period)
    db.commit()
    db.refresh(db_period)
    return db_period


@router.post("/{period_id}/freeze", response_model=PeriodResponse)
async def freeze_period(period_id: int, db: Session = Depends(get_db)):
    """Freeze a period (make it read-only and calculate final totals)."""
    db_period = db.get(Period, period_id)
    if not db_period:
        raise HTTPException(status_code=404, detail="Period not found")

    if db_period.status == "frozen":
        raise HTTPException(status_code=409, detail="Period is already frozen")

    # Ensure all expenses have sharing entries
    for expense in db_period.expenses:
        if not expense.sharing_entries:
            raise HTTPException(
                status_code=400,
                detail=f"Expense {expense.id} has no sharing entries",
            )

    # Calculate totals
    totals = calculator.get_period_summary(period_id, db)

    # Freeze period and all its expenses
    db_period.status = "frozen"
    db_period.frozen_at = datetime.utcnow()
    db_period.total_amount = totals["total"]
    db_period.adulte1_total = totals["adulte1_total"]
    db_period.adulte2_total = totals["adulte2_total"]

    for expense in db_period.expenses:
        expense.status = "frozen"

    db.add(db_period)
    db.commit()
    db.refresh(db_period)
    return db_period


@router.post("/{period_id}/add-expense/{expense_id}", response_model=PeriodResponse)
async def add_expense_to_period(
    period_id: int, expense_id: int, db: Session = Depends(get_db)
):
    """Add an expense to a period."""
    db_period = db.get(Period, period_id)
    if not db_period:
        raise HTTPException(status_code=404, detail="Period not found")

    if db_period.status == "frozen":
        raise HTTPException(status_code=409, detail="Cannot add to a frozen period")

    db_expense = db.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db_expense.period_id = period_id
    db.add(db_expense)
    db.commit()
    db.refresh(db_period)
    return db_period


@router.delete("/{period_id}", status_code=204)
async def delete_period(period_id: int, db: Session = Depends(get_db)):
    """Delete a period (only if draft and has no expenses)."""
    db_period = db.get(Period, period_id)
    if not db_period:
        raise HTTPException(status_code=404, detail="Period not found")

    if db_period.status == "frozen":
        raise HTTPException(status_code=409, detail="Cannot delete a frozen period")

    if db_period.expenses:
        raise HTTPException(
            status_code=409, detail="Cannot delete a period with expenses"
        )

    db.delete(db_period)
    db.commit()
    return None
