from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class TelegramImportRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    amount: str = Field(..., pattern=r'^[\d.,]+$')
    category: Optional[str] = None
    date: date
    comment: Optional[str] = None
    # Absent (None) pour un expéditeur inconnu du bot — la dépense reste non
    # attribuée plutôt que d'être assignée à tort à un compte (voir
    # TELEGRAM_SENDER_TO_ACCOUNT côté bot et routers/imports.py).
    account_id: Optional[int] = None


class CsvImportRequest(BaseModel):
    pass  # À implémenter plus tard
