#!/usr/bin/env python3
"""Import brico expenses from CSV file."""

import sys
import csv
from pathlib import Path
from datetime import datetime, date

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense, Account
from decimal import Decimal


def parse_amount(amount_str):
    """Parse French decimal format (comma separator)."""
    if not amount_str or amount_str.strip() == '':
        return None

    # Remove spaces and convert comma to dot
    cleaned = amount_str.strip().replace(' ', '').replace(',', '.')
    # Remove € symbol if present
    cleaned = cleaned.replace('€', '').strip()

    try:
        return Decimal(cleaned)
    except:
        return None


def should_skip_row(row):
    """Check if row should be skipped - NOTHING is skipped."""
    return False


def parse_date(date_str):
    """Parse date from various formats."""
    if not date_str or date_str.strip() == '':
        return date(2025, 1, 1)  # Default fictive date

    date_str = date_str.strip()

    # Try various formats
    formats = [
        '%d/%m/%Y',
        '%d/%m',
        '%d/%m/%y',
        '%Y-%m-%d',
    ]

    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str, fmt)
            # If year is 2-digit or missing, assume 2025
            if parsed.year < 1900:
                parsed = parsed.replace(year=2025)
            return parsed.date()
        except ValueError:
            continue

    # Default if no format matches
    return date(2025, 1, 1)


def import_brico(csv_file):
    """Import brico expenses from CSV."""
    db = SessionLocal()

    imported = 0
    skipped = 0
    errors = 0

    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (skip header)
                try:
                    # Skip rows that shouldn't be imported
                    if should_skip_row(row):
                        skipped += 1
                        continue

                    # Get amount from Loic or Alice column
                    loic_amount = parse_amount(row.get('Loic', ''))
                    alice_amount = parse_amount(row.get('Alice', ''))

                    # Skip if no amount
                    if not loic_amount and not alice_amount:
                        skipped += 1
                        continue

                    # Determine account and amount
                    if loic_amount:
                        account_id = 1  # Loïc
                        amount = loic_amount
                    else:
                        account_id = 2  # Alice
                        amount = alice_amount

                    # Parse date
                    expense_date = parse_date(row.get('Date', ''))

                    # Build label and comment
                    quoi = row.get('Quoi', 'Brico')
                    commentaires = row.get('Commentaires', '')
                    lien = row.get('Commentaires', '')  # Links might be in comments

                    # Try to find links in the row
                    for key, value in row.items():
                        if value and 'drive.google.com' in str(value):
                            lien = value
                            break

                    # Build comment with link
                    comment = ''
                    if commentaires and commentaires.strip():
                        comment = commentaires
                    if lien and 'drive.google.com' in str(lien):
                        if comment:
                            comment += f'\n🔗 {lien}'
                        else:
                            comment = f'🔗 {lien}'

                    # Create expense
                    expense = Expense(
                        date=expense_date,
                        label=quoi if quoi.strip() else 'Brico',
                        amount=amount,
                        account_id=account_id,
                        category='brico',
                        source='csv_import',  # Use valid enum value
                        status='draft',
                        sharing_mode='brico',  # Custom sharing for brico
                        comment=comment if comment.strip() else None,
                    )

                    db.add(expense)
                    imported += 1

                except Exception as e:
                    print(f"❌ Ligne {row_num}: {str(e)}")
                    errors += 1
                    continue

        db.commit()
        print(f"\n✅ Import terminé!")
        print(f"  📦 Importées: {imported} dépenses brico")
        print(f"  ⏭️  Ignorées: {skipped} lignes (ajustements de compte)")
        print(f"  ⚠️  Erreurs: {errors}")

    except FileNotFoundError:
        print(f"❌ Fichier non trouvé: {csv_file}")
    finally:
        db.close()


if __name__ == "__main__":
    csv_file = "/Users/logo/Downloads/brico.csv"

    if len(sys.argv) > 1:
        csv_file = sys.argv[1]

    import_brico(csv_file)
