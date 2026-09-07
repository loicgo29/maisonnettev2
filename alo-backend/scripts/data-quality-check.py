#!/usr/bin/env python3
"""Data Quality Check — Détecte doublons, mauvaises catégorisations, anomalies."""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, engine
from app.models import Expense, Base
from sqlalchemy import func

def check_duplicates():
    """Détecte les doublons potentiels."""
    db = SessionLocal()
    duplicates = []

    try:
        # Agrège par (date, amount, source, account_id)
        dups = db.query(
            Expense.date,
            Expense.amount,
            Expense.source,
            Expense.account_id,
            func.count(Expense.id).label('count')
        ).group_by(
            Expense.date,
            Expense.amount,
            Expense.source,
            Expense.account_id
        ).having(func.count(Expense.id) > 1).all()

        for dup in dups:
            duplicates.append({
                'date': dup.date,
                'amount': dup.amount,
                'source': dup.source,
                'account_id': dup.account_id,
                'count': dup.count
            })
    finally:
        db.close()

    return duplicates

def check_categorization():
    """Vérifie que % divers < 20%."""
    db = SessionLocal()
    result = {'total': 0, 'divers': 0, 'percentage': 0}

    try:
        total = db.query(func.count(Expense.id)).scalar() or 0
        divers = db.query(func.count(Expense.id)).filter(Expense.category == 'divers').scalar() or 0

        result = {
            'total': total,
            'divers': divers,
            'percentage': (divers / total * 100) if total > 0 else 0
        }
    finally:
        db.close()

    return result

def check_anomalies():
    """Détecte montants extrêmes, dates invalides."""
    db = SessionLocal()
    anomalies = []

    try:
        expenses = db.query(Expense).all()
        now = datetime.now().date()

        for exp in expenses:
            issues = []

            # Montant extrême pour alimentation
            if exp.category == '50/50' and exp.amount > Decimal('1000'):
                issues.append(f'Montant très élevé pour alimentation: {exp.amount}€')

            # Date très ancienne (>5 ans)
            if (now - exp.date).days > 1825:
                issues.append(f'Date très ancienne: {exp.date}')

            # Date future
            if exp.date > now:
                issues.append(f'Date future: {exp.date}')

            # Label vide ou très court
            if not exp.label or len(exp.label) < 3:
                issues.append(f'Label invalide: "{exp.label}"')

            if issues:
                anomalies.append({
                    'id': exp.id,
                    'label': exp.label,
                    'date': exp.date,
                    'amount': exp.amount,
                    'issues': issues
                })
    finally:
        db.close()

    return anomalies

def main():
    print("\n" + "="*60)
    print("🔍 Data Quality Check")
    print("="*60 + "\n")

    errors = 0

    # Check 1: Doublons
    print("1️⃣  Vérification des doublons...")
    dups = check_duplicates()
    if dups:
        print(f"   ❌ {len(dups)} doublon(s) trouvé(s)")
        for dup in dups:
            print(f"      - {dup['date']} / {dup['amount']}€ ({dup['source']}) x{dup['count']}")
        errors += 1
    else:
        print("   ✅ Aucun doublon")

    # Check 2: Catégorisation
    print("\n2️⃣  Vérification des catégorisations...")
    cat = check_categorization()
    print(f"   Total: {cat['total']} | Divers: {cat['divers']} ({cat['percentage']:.1f}%)")
    if cat['percentage'] > 20:
        print(f"   ⚠️  Trop de 'divers' (>{20}%)")
        errors += 1
    else:
        print("   ✅ Catégorisations OK")

    # Check 3: Anomalies
    print("\n3️⃣  Vérification des anomalies...")
    anom = check_anomalies()
    if anom:
        print(f"   ❌ {len(anom)} anomalie(s) trouvée(s)")
        for a in anom[:5]:  # Afficher max 5
            print(f"      - {a['label']}: {', '.join(a['issues'])}")
        if len(anom) > 5:
            print(f"      ... et {len(anom) - 5} de plus")
        errors += 1
    else:
        print("   ✅ Aucune anomalie")

    # Résultat final
    print("\n" + "="*60)
    if errors == 0:
        print("✅ QUALITÉ OK — Pas de problèmes détectés")
        print("="*60 + "\n")
        return 0
    else:
        print(f"❌ QUALITÉ DÉGRADÉE — {errors} problème(s) trouvé(s)")
        print("="*60 + "\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
