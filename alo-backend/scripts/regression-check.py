#!/usr/bin/env python3
"""Regression Monitor — Détecte les régressions après changements."""

import sys
import json
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Expense
from sqlalchemy import func

SNAPSHOT_FILE = Path(__file__).parent.parent.parent / "data" / ".regression-snapshot.json"

def take_snapshot():
    """Crée un snapshot des données actuelles."""
    db = SessionLocal()
    try:
        snapshot = {
            'timestamp': date.today().isoformat(),
            'total_expenses': db.query(func.count(Expense.id)).scalar() or 0,
            'categories': {},
            'by_source': {}
        }

        # Compter par catégorie
        for category in ['50/50', 'brico', 'quotepart', 'divers', 'virement']:
            count = db.query(func.count(Expense.id)).filter(Expense.category == category).scalar() or 0
            snapshot['categories'][category] = count

        # Compter par source
        for source in ['telegram', 'csv_import']:
            count = db.query(func.count(Expense.id)).filter(Expense.source == source).scalar() or 0
            snapshot['by_source'][source] = count

        return snapshot
    finally:
        db.close()

def compare_snapshots():
    """Compare le snapshot actuel avec le précédent."""
    if not SNAPSHOT_FILE.exists():
        return None, "⚠️  Pas de snapshot précédent pour comparer"

    try:
        with open(SNAPSHOT_FILE) as f:
            old_snapshot = json.load(f)

        new_snapshot = take_snapshot()

        # Comparer
        issues = []
        total_diff = new_snapshot['total_expenses'] - old_snapshot['total_expenses']

        if total_diff != 0:
            issues.append(f"Count d'expenses a changé: {old_snapshot['total_expenses']} → {new_snapshot['total_expenses']}")

        # Comparer catégories
        for cat in ['50/50', 'brico', 'quotepart', 'divers', 'virement']:
            old_count = old_snapshot['categories'].get(cat, 0)
            new_count = new_snapshot['categories'].get(cat, 0)
            if old_count != new_count:
                issues.append(f"  - {cat}: {old_count} → {new_count}")

        return new_snapshot, issues
    except Exception as e:
        return None, f"❌ Erreur lecture snapshot: {str(e)}"

def main():
    print("\n" + "="*60)
    print("🔄 Regression Check")
    print("="*60 + "\n")

    # Comparer avant/après
    new_snap, issues = compare_snapshots()

    if issues is None:
        print(f"{issues}")
        print("   → Créant le premier snapshot...")
        snap = take_snapshot()
        SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SNAPSHOT_FILE, 'w') as f:
            json.dump(snap, f)
        print(f"✅ Snapshot créé: {snap}")
        return 0

    if isinstance(issues, str):
        print(issues)
        return 1

    if not issues:
        print("✅ Aucune régression détectée")
        print("="*60 + "\n")
        return 0

    print(f"❌ {len(issues)} changement(s) détecté(s):")
    for issue in issues:
        print(f"   {issue}")
    print("="*60 + "\n")

    return 1

if __name__ == '__main__':
    sys.exit(main())
