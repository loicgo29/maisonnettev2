from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class TelegramImportRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    amount: str = Field(..., pattern=r'^[\d.,]+$')
    category: Optional[str] = None
    date: date
    comment: Optional[str] = None


class CsvImportRequest(BaseModel):
    pass  # À implémenter plus tard
