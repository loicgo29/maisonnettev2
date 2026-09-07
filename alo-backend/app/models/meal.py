from sqlalchemy import Integer, String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from datetime import date


class MealRecord(Base):
    __tablename__ = "meal_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(nullable=False)
    month: Mapped[int] = mapped_column(nullable=False)  # 1-12
    day: Mapped[int] = mapped_column(nullable=False)    # 1-31
    account: Mapped[str] = mapped_column(nullable=False)  # "gourmich" ou "tigresse"
    person: Mapped[str] = mapped_column(nullable=False)   # Nom de la personne
    repas: Mapped[int] = mapped_column(default=0)         # Nombre de repas (0-3)

    def __repr__(self):
        return f"<MealRecord {self.year}-{self.month:02d}-{self.day:02d} {self.account}/{self.person}: {self.repas}>"
