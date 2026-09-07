#!/usr/bin/env python3
"""Export expenses to Excel format."""

import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
except ImportError:
    print("❌ openpyxl not installed. Install with: pip install openpyxl")
    sys.exit(1)


def export_expenses_excel(output_file: str):
    """Export expenses to Excel with formatting."""
    db = SessionLocal()
    expenses = db.query(Expense).order_by(Expense.date.desc()).all()

    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Dépenses"

    # Define styles
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Headers
    headers = ['ID', 'Date', 'Libellé', 'Montant', 'Compte', 'Catégorie',
               'Source', 'Statut', 'Ventilation', 'Commentaire', 'Créé', 'Modifié']

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border

    # Account mapping
    account_map = {1: 'Loïc', 2: 'Alice', 3: 'CC', 5: 'Fortuneo'}

    # Data rows
    for row_idx, exp in enumerate(expenses, 2):
        account_name = account_map.get(exp.account_id, f'Account {exp.account_id}')

        row_data = [
            exp.id,
            exp.date,
            exp.label,
            float(exp.amount),
            account_name,
            exp.category or '',
            exp.source or '',
            exp.status or '',
            exp.sharing_mode or '',
            exp.comment or '',
            exp.created_at.isoformat() if exp.created_at else '',
            exp.updated_at.isoformat() if exp.updated_at else ''
        ]

        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col)
            cell.value = value
            cell.border = border

            # Format amount as currency (French format with comma)
            if col == 4:  # Montant
                cell.number_format = '#,##0.00€'
                cell.alignment = Alignment(horizontal='right')
            elif col == 1:  # ID
                cell.alignment = Alignment(horizontal='center')
            elif col == 2:  # Date
                cell.alignment = Alignment(horizontal='center')

    # Auto-adjust column widths
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 12
    ws.column_dimensions['C'].width = 30
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 12
    ws.column_dimensions['H'].width = 10
    ws.column_dimensions['I'].width = 12
    ws.column_dimensions['J'].width = 25
    ws.column_dimensions['K'].width = 20
    ws.column_dimensions['L'].width = 20

    # Freeze header row
    ws.freeze_panes = 'A2'

    # Save
    wb.save(output_file)
    db.close()

    print(f"✅ Exported {len(expenses)} expenses to {output_file}")


if __name__ == "__main__":
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"depenses_export_{timestamp}.xlsx"

    export_expenses_excel(output_file)
    print(f"\n📁 File created: {output_file}")
