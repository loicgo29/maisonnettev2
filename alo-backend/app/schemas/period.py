from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class PeriodBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date
    notes: Optional[str] = None


class PeriodCreate(PeriodBase):
    pass


class PeriodUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None


class PeriodResponse(PeriodBase):
    id: int
    status: str
    total_amount: Decimal
    adulte1_total: Decimal
    adulte2_total: Decimal
    frozen_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PeriodSummary(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    status: str
    total_amount: Decimal
    adulte1_total: Decimal
    adulte2_total: Decimal
    expense_count: int
