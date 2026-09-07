from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from app.models import Expense, PresencePeriod, SharingEntry


class SharingCalculator:
    """Core business logic for expense sharing calculations."""

    def get_garde_ratio(
        self, start_date: date, end_date: date, db: Session
    ) -> dict[str, Decimal]:
        """
        Calculate the custody ratio (adulte1/adulte2) based on presence periods.

        Returns: {"adulte1": 0.58, "adulte2": 0.42} for example.
        If no presence data, defaults to 50/50.
        """
        periods = db.query(PresencePeriod).filter(
            PresencePeriod.start_date <= end_date,
            PresencePeriod.end_date >= start_date,
        ).all()

        days = {"adulte1": 0, "adulte2": 0}

        for period in periods:
            effective_start = max(period.start_date, start_date)
            effective_end = min(period.end_date, end_date)
            duration = (effective_end - effective_start).days + 1
            days[period.parent] += duration

        total = sum(days.values())
        if total == 0:
            return {"adulte1": Decimal("0.5"), "adulte2": Decimal("0.5")}

        return {
            "adulte1": (Decimal(days["adulte1"]) / Decimal(total)).quantize(Decimal("0.0001")),
            "adulte2": (Decimal(days["adulte2"]) / Decimal(total)).quantize(Decimal("0.0001")),
        }

    def calculate_sharing(
        self,
        expense: Expense,
        db: Session,
        manual_override: dict[str, Decimal] | None = None,
    ) -> list[SharingEntry]:
        """
        Calculate sharing for a single expense.

        Priority order:
        1. Manual override (explicit user correction)
        2. Custody ratio (for "enfants" category)
        3. Default 50/50 split
        """
        if manual_override:
            rule = "manuel"
            ratios = manual_override
        elif expense.category == "enfants":
            rule = "garde_ratio"
            ratios = self.get_garde_ratio(expense.date, expense.date, db)
        else:
            rule = "50/50"
            ratios = {"adulte1": Decimal("0.5"), "adulte2": Decimal("0.5")}

        entries = []
        for person, ratio in ratios.items():
            amount = (expense.amount * ratio).quantize(Decimal("0.01"))
            entries.append(
                SharingEntry(
                    expense_id=expense.id,
                    person=person,
                    ratio=ratio,
                    amount=amount,
                    rule_used=rule,
                    is_manual_override=(rule == "manuel"),
                )
            )

        return entries

    def recalculate_period(self, period_id: int, db: Session) -> None:
        """
        Recalculate all draft expenses in a period.
        Leaves frozen expenses untouched.
        """
        expenses = db.query(Expense).filter(
            Expense.period_id == period_id,
            Expense.status == "draft",
        ).all()

        for expense in expenses:
            # Delete old non-override entries
            db.query(SharingEntry).filter(
                SharingEntry.expense_id == expense.id,
                SharingEntry.is_manual_override == False,
            ).delete()

            # Recalculate
            new_entries = self.calculate_sharing(expense, db)
            for entry in new_entries:
                db.add(entry)

        db.commit()

    def get_period_summary(self, period_id: int, db: Session) -> dict:
        """Return aggregated totals for a period."""
        entries = db.query(SharingEntry).join(Expense).filter(
            Expense.period_id == period_id
        ).all()

        totals = {
            "adulte1": Decimal("0.00"),
            "adulte2": Decimal("0.00"),
        }

        for entry in entries:
            totals[entry.person] = (totals[entry.person] + entry.amount).quantize(
                Decimal("0.01")
            )

        return {
            "adulte1_total": totals["adulte1"],
            "adulte2_total": totals["adulte2"],
            "total": (totals["adulte1"] + totals["adulte2"]).quantize(Decimal("0.01")),
        }
