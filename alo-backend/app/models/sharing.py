from sqlalchemy import Numeric, Enum as SQLEnum, ForeignKey, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from app.database import Base


class SharingEntry(Base):
    __tablename__ = "sharing_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    expense_id: Mapped[int] = mapped_column(ForeignKey("expenses.id"), nullable=False)
    person: Mapped[str] = mapped_column(
        SQLEnum("adulte1", "adulte2", name="sharing_person_enum"),
        nullable=False,
    )
    ratio: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    rule_used: Mapped[str] = mapped_column(String(50), nullable=False)
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    expense: Mapped["Expense"] = relationship(back_populates="sharing_entries")
