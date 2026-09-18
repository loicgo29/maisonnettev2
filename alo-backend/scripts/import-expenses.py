#!/usr/bin/env python3
"""
Import expenses from CSV to DB.
Fails if any expense ID already exists (no upsert).
Updates .alo-sync-timestamp on success.
"""

import sys
import csv
import os
from datetime import datetime
from pathlib import Path
from decimal import Decimal

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.expense import Expense

TIMESTAMP_FILE = Path(".alo-sync-timestamp")

def import_expenses():
    """Import expenses from CSV (stdin) to DB."""

    db = SessionLocal()
    try:
        reader = csv.DictReader(sys.stdin)
        if not reader:
            print("❌ No CSV data on stdin", file=sys.stderr)
            sys.exit(1)

        expenses = list(reader)
        print(f"📥 Importing {len(expenses)} expenses...", file=sys.stderr)

        for i, row in enumerate(expenses, 1):
            expense_id = int(row['id'])

            # Check for duplicate
            existing = db.query(Expense).filter(Expense.id == expense_id).first()
            if existing:
                print(f"❌ Duplicate ID {expense_id} (row {i})", file=sys.stderr)
                db.rollback()
                sys.exit(1)

            # Parse and insert
            try:
                expense = Expense(
                    id=expense_id,
                    date=datetime.fromisoformat(row['date']).date(),
                    amount=Decimal(row['amount']),
                    label=row['label'],
                    category=row['category'],
                    source=row['source'],
                    status=row['status'],
                    comment=row['comment'] or None,
                    sharing_mode=row['sharing_mode'] or None,
                    account_id=int(row['account_id']) if row['account_id'] else None,
                    period_id=int(row['period_id']) if row['period_id'] else None,
                    created_at=datetime.fromisoformat(row['created_at']),
                    updated_at=datetime.fromisoformat(row['updated_at']),
                )
                db.add(expense)
                print(f"  ✓ Row {i}: {expense.label} ({expense.amount})", file=sys.stderr)
            except Exception as e:
                print(f"❌ Row {i} parse error: {e}", file=sys.stderr)
                db.rollback()
                sys.exit(1)

        # Commit all at once
        try:
            db.commit()
            print(f"✅ Imported {len(expenses)} expenses", file=sys.stderr)
        except Exception as e:
            print(f"❌ Commit failed: {e}", file=sys.stderr)
            db.rollback()
            sys.exit(1)

        # Update last sync timestamp
        now = datetime.utcnow().isoformat()
        with open(TIMESTAMP_FILE, 'w') as f:
            f.write(now)
        print(f"📝 Updated sync timestamp: {now}", file=sys.stderr)

    finally:
        db.close()

if __name__ == "__main__":
    import_expenses()
