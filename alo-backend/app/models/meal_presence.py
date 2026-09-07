from sqlalchemy import Integer, String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from datetime import datetime


class MealPresence(Base):
    __tablename__ = "meal_presence"

    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(nullable=False)
    month: Mapped[int] = mapped_column(nullable=False)  # 1-12
    day: Mapped[int] = mapped_column(nullable=False)    # 1-31
    account: Mapped[str] = mapped_column(nullable=False)  # "gourmich" ou "tigresse"
    person: Mapped[str] = mapped_column(nullable=False)   # Nom de la personne
    midi: Mapped[bool] = mapped_column(default=True)       # présent/absent à midi
    soir: Mapped[bool] = mapped_column(default=True)       # présent/absent le soir
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        # Contrainte unique : une seule entrée par (year, month, day, account, person)
        __import__('sqlalchemy').UniqueConstraint('year', 'month', 'day', 'account', 'person', name='uq_meal_presence'),
    )

    def __repr__(self):
        return f"<MealPresence {self.year}-{self.month:02d}-{self.day:02d} {self.account}/{self.person}: midi={self.midi}, soir={self.soir}>"
