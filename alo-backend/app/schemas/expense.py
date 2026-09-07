from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class ExpenseBase(BaseModel):
    date: date
    amount: Decimal = Field(..., decimal_places=2, gt=0)
    label: str = Field(..., min_length=1, max_length=255)
    category: str = Field(
        default="50/50",
        pattern="^(quotepart|50/50|dette|brico|virement|trop_plein|regule_periode|divers)$",
    )
    source: str = Field(default="manuel", pattern="^(manuel|telegram|csv_import|bankin|brico)$")
    comment: Optional[str] = None
    account_id: Optional[int] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    label: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    account_id: Optional[int] = None
    comment: Optional[str] = None
    sharing_mode: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    status: str
    sharing_mode: Optional[str] = None
    period_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
