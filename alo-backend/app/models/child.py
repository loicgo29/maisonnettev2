from sqlalchemy import String, Date, Enum as SQLEnum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from datetime import date
from app.database import Base


class Child(Base):
    __tablename__ = "children"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    primary_parent: Mapped[str] = mapped_column(
        SQLEnum("adulte1", "adulte2", name="parent_enum"),
        nullable=False,
    )

    presence_periods: Mapped[List["PresencePeriod"]] = relationship(
        back_populates="child", cascade="all, delete-orphan"
    )


class PresencePeriod(Base):
    __tablename__ = "presence_periods"

    id: Mapped[int] = mapped_column(primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id"), nullable=False)
    parent: Mapped[str] = mapped_column(
        SQLEnum("adulte1", "adulte2", name="presence_parent_enum"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, nullable=False)

    child: Mapped["Child"] = relationship(back_populates="presence_periods")
