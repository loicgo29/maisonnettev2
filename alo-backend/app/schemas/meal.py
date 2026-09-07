from pydantic import BaseModel, Field
from typing import Optional


class MealRecordCreate(BaseModel):
    year: int = Field(..., ge=2020, le=2099)
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    account: str = Field(..., pattern="^(gourmich|tigresse)$")
    person: str = Field(..., min_length=1, max_length=50)
    repas: int = Field(default=0, ge=0, le=4)


class MealRecordUpdate(BaseModel):
    repas: int = Field(ge=0, le=4)


class MealRecordResponse(MealRecordCreate):
    id: int

    class Config:
        from_attributes = True


class MealDayResponse(BaseModel):
    year: int
    month: int
    day: int
    account: str
    meals: dict  # {"Loïc": 3, "Alban": 0, ...}

    class Config:
        from_attributes = True
