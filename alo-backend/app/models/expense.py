from sqlalchemy import String, Numeric, Date, DateTime, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(
        SQLEnum(
            "quotepart",
            "50/50",
            "dette",
            "brico",
            "virement",
            "trop_plein",
            "regule_periode",
            "divers",
            name="expense_category",
        ),
        default="50/50",
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        SQLEnum("manuel", "telegram", "csv_import", "bankin", "brico", name="expense_source"),
        default="manuel",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        SQLEnum("draft", "frozen", name="expense_status"),
        default="draft",
        nullable=False,
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sharing_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    account_id: Mapped[Optional[int]] = mapped_column(ForeignKey("accounts.id"), nullable=True)
    period_id: Mapped[Optional[int]] = mapped_column(ForeignKey("periods.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    account: Mapped[Optional["Account"]] = relationship(back_populates="expenses")
    period: Mapped[Optional["Period"]] = relationship(back_populates="expenses")
    sharing_entries: Mapped[List["SharingEntry"]] = relationship(
        back_populates="expense", cascade="all, delete-orphan"
    )
