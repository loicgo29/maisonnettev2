from sqlalchemy import String, Numeric, DateTime, Enum as SQLEnum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    institution: Mapped[str] = mapped_column(String(100), nullable=False)
    owner: Mapped[str] = mapped_column(
        SQLEnum("adulte1", "adulte2", "commun", name="account_owner"),
        nullable=False,
    )
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    expenses: Mapped[List["Expense"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    balance_history: Mapped[List["AccountBalance"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class AccountBalance(Base):
    __tablename__ = "account_balances"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    account: Mapped["Account"] = relationship(back_populates="balance_history")
