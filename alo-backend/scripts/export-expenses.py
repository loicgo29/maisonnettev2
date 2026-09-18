#!/usr/bin/env python3
"""
Export expenses from local DB to CSV.
Exports only expenses updated since last sync (tracked in .alo-sync-timestamp).
"""

import sys
import csv
import os
from datetime import datetime
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.expense import Expense

TIMESTAMP_FILE = Path(".alo-sync-timestamp")

def get_last_sync_date():
    """Read last sync timestamp, or return epoch if not found."""
    if TIMESTAMP_FILE.exists():
        with open(TIMESTAMP_FILE) as f:
            timestamp_str = f.read().strip()
            return datetime.fromisoformat(timestamp_str)
    return datetime.fromisoformat("2000-01-01T00:00:00")

def export_expenses():
    """Export expenses updated since last sync to CSV."""

    last_sync = get_last_sync_date()
    print(f"📥 Exporting expenses updated since: {last_sync}", file=sys.stderr)

    db = SessionLocal()
    try:
        # Query: expenses updated since last sync
        expenses = db.query(Expense).filter(
            Expense.updated_at > last_sync
        ).order_by(Expense.id).all()

        print(f"📊 Found {len(expenses)} new/updated expenses", file=sys.stderr)

        # CSV output to stdout
        writer = csv.DictWriter(sys.stdout, fieldnames=[
            'id', 'date', 'amount', 'label', 'category', 'source', 'status',
            'comment', 'sharing_mode', 'account_id', 'period_id',
            'created_at', 'updated_at'
        ])

        writer.writeheader()
        for expense in expenses:
            writer.writerow({
                'id': expense.id,
                'date': expense.date.isoformat(),
                'amount': str(expense.amount),
                'label': expense.label,
                'category': expense.category,
                'source': expense.source,
                'status': expense.status,
                'comment': expense.comment or '',
                'sharing_mode': expense.sharing_mode or '',
                'account_id': expense.account_id or '',
                'period_id': expense.period_id or '',
                'created_at': expense.created_at.isoformat(),
                'updated_at': expense.updated_at.isoformat(),
            })

        print(f"✅ Export complete: {len(expenses)} expenses", file=sys.stderr)

    finally:
        db.close()

if __name__ == "__main__":
    export_expenses()
