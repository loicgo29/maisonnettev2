"""Moteur de rééquilibrage des dépenses ALO."""

from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.expense import Expense
from app.models.meal import MealRecord


def get_quotepart_from_meals(start_date: date, end_date: date, db: Session) -> dict:
    """
    Calcule la quote-part depuis les repas enregistrés sur la période.

    quote_part_loic = somme repas Gourmich / somme repas total
    quote_part_alice = somme repas Tigresse / somme repas total

    Args:
        start_date: début de la période
        end_date: fin de la période
        db: session SQLAlchemy

    Returns:
        {'loic': Decimal('0.58'), 'alice': Decimal('0.42')}
        Fallback 50/50 si aucun repas enregistré.
    """
    # Récupérer tous les repas et filtrer en Python (plus simple et plus robuste)
    all_meals = db.query(MealRecord).all()

    gourmich_repas = sum(
        m.repas for m in all_meals
        if m.account == "gourmich" and
        date(m.year, m.month, m.day) >= start_date and
        date(m.year, m.month, m.day) <= end_date
    ) or 0

    tigresse_repas = sum(
        m.repas for m in all_meals
        if m.account == "tigresse" and
        date(m.year, m.month, m.day) >= start_date and
        date(m.year, m.month, m.day) <= end_date
    ) or 0

    total_repas = Decimal(gourmich_repas) + Decimal(tigresse_repas)

    if total_repas == 0:
        return {"loic": Decimal("0.5"), "alice": Decimal("0.5")}

    return {
        "loic": (Decimal(gourmich_repas) / total_repas).quantize(Decimal("0.0001")),
        "alice": (Decimal(tigresse_repas) / total_repas).quantize(Decimal("0.0001")),
    }


def calculate_charges_theoriques(start_date: date, end_date: date, db: Session, quotepart: dict) -> dict:
    """
    Calcule ce que chacun DEVRAIT payer en théorie sur la période.

    Périmètre : uniquement quotepart et 50/50. Exclut brico, dette, virement.

    Args:
        start_date: début de la période
        end_date: fin de la période
        db: session SQLAlchemy
        quotepart: dict {'loic': Decimal, 'alice': Decimal} de la période

    Returns:
        {
            'loic': Decimal(...),
            'alice': Decimal(...),
            'detail': [
                {'category': 'quotepart', 'loic': X, 'alice': Y, ...},
                {'category': '50/50', 'loic': X, 'alice': Y, ...},
            ]
        }
    """
    loic_total = Decimal("0.00")
    alice_total = Decimal("0.00")
    detail = []

    # Quotepart : repas ratio
    quotepart_expenses = db.query(Expense).filter(
        Expense.category == "quotepart",
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    quotepart_loic = Decimal("0.00")
    quotepart_alice = Decimal("0.00")

    for exp in quotepart_expenses:
        amount = Decimal(str(exp.amount))
        loic_share = (amount * quotepart["loic"]).quantize(Decimal("0.01"))
        alice_share = (amount * quotepart["alice"]).quantize(Decimal("0.01"))
        quotepart_loic += loic_share
        quotepart_alice += alice_share

    if quotepart_loic > 0 or quotepart_alice > 0:
        detail.append({
            "category": "quotepart",
            "loic": quotepart_loic,
            "alice": quotepart_alice,
            "count": len(quotepart_expenses),
        })
        loic_total += quotepart_loic
        alice_total += quotepart_alice

    # 50/50
    fifty_expenses = db.query(Expense).filter(
        Expense.category == "50/50",
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    fifty_loic = Decimal("0.00")
    fifty_alice = Decimal("0.00")

    for exp in fifty_expenses:
        amount = Decimal(str(exp.amount))
        half = (amount / Decimal("2")).quantize(Decimal("0.01"))
        fifty_loic += half
        fifty_alice += half

    if fifty_loic > 0 or fifty_alice > 0:
        detail.append({
            "category": "50/50",
            "loic": fifty_loic,
            "alice": fifty_alice,
            "count": len(fifty_expenses),
        })
        loic_total += fifty_loic
        alice_total += fifty_alice

    return {
        "loic": loic_total.quantize(Decimal("0.01")),
        "alice": alice_total.quantize(Decimal("0.01")),
        "detail": detail,
    }


def calculate_financement_reel(start_date: date, end_date: date, db: Session) -> dict:
    """
    Calcule le financement réel des charges communes.

    Financement = Virements (au pot commun) + Telegram quotepart/50/50 (charges avancées).
    Charges = Quotepart + 50/50 (réparties au ratio, toutes sources).
    CSV Import = charges payées par compte commun, financées par virements.

    Args:
        start_date: début de la période
        end_date: fin de la période
        db: session SQLAlchemy

    Returns:
        {
            'loic': Decimal(...),
            'alice': Decimal(...),
            'virements': {'loic': X, 'alice': Y, 'count': Z, 'detail': [...]},
            'telegram': {'loic': X, 'alice': Y, 'count': Z, 'detail': [...]}
        }
    """
    loic_total = Decimal("0.00")
    alice_total = Decimal("0.00")

    # Virements (argent au pot commun)
    virements_loic = db.query(func.sum(Expense.amount)).filter(
        Expense.category == "virement",
        Expense.account_id == 1,
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).scalar() or Decimal("0.00")

    virements_alice = db.query(func.sum(Expense.amount)).filter(
        Expense.category == "virement",
        Expense.account_id == 2,
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).scalar() or Decimal("0.00")

    virements_loic = Decimal(str(virements_loic)).quantize(Decimal("0.01"))
    virements_alice = Decimal(str(virements_alice)).quantize(Decimal("0.01"))

    virements_loic_detail = db.query(Expense).filter(
        Expense.category == "virement",
        Expense.account_id == 1,
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    virements_alice_detail = db.query(Expense).filter(
        Expense.category == "virement",
        Expense.account_id == 2,
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    loic_total += virements_loic
    alice_total += virements_alice

    # Dépenses Telegram (charges avancées payées de la poche - quotepart + 50/50 seulement)
    telegram_loic = db.query(func.sum(Expense.amount)).filter(
        Expense.source == "telegram",
        Expense.account_id == 1,
        Expense.category.in_(["quotepart", "50/50"]),
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).scalar() or Decimal("0.00")

    telegram_alice = db.query(func.sum(Expense.amount)).filter(
        Expense.source == "telegram",
        Expense.account_id == 2,
        Expense.category.in_(["quotepart", "50/50"]),
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).scalar() or Decimal("0.00")

    telegram_loic = Decimal(str(telegram_loic)).quantize(Decimal("0.01"))
    telegram_alice = Decimal(str(telegram_alice)).quantize(Decimal("0.01"))

    telegram_loic_detail = db.query(Expense).filter(
        Expense.source == "telegram",
        Expense.account_id == 1,
        Expense.category.in_(["quotepart", "50/50"]),
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    telegram_alice_detail = db.query(Expense).filter(
        Expense.source == "telegram",
        Expense.account_id == 2,
        Expense.category.in_(["quotepart", "50/50"]),
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    loic_total += telegram_loic
    alice_total += telegram_alice

    return {
        "loic": loic_total.quantize(Decimal("0.01")),
        "alice": alice_total.quantize(Decimal("0.01")),
        "virements": {
            "loic": virements_loic,
            "alice": virements_alice,
            "loic_count": len(virements_loic_detail),
            "alice_count": len(virements_alice_detail),
            "count": len(virements_loic_detail) + len(virements_alice_detail),
        },
        "telegram": {
            "loic": telegram_loic,
            "alice": telegram_alice,
            "loic_count": len(telegram_loic_detail),
            "alice_count": len(telegram_alice_detail),
            "count": len(telegram_loic_detail) + len(telegram_alice_detail),
        },
    }


def calculate_reequilibrage(period_id: int, db: Session) -> dict:
    """
    Orchestre le calcul complet : quote-part → charges → financement → solde.

    Args:
        period_id: ID de la période
        db: session SQLAlchemy

    Returns:
        {
            'period_id': int,
            'start_date': str,
            'end_date': str,
            'quotepart': {'loic': 0.58, 'alice': 0.42},
            'charges': {'loic': Decimal, 'alice': Decimal, 'detail': [...]},
            'financement': {'loic': Decimal, 'alice': Decimal, 'virements': {...}, 'telegram': {...}},
            'solde': {'loic': Decimal, 'alice': Decimal},
            'conclusion': str (ex: "loic doit 560.00€ à alice")
        }
    """
    from app.models.period import Period

    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        return {"error": f"Period {period_id} not found"}

    start_date = period.start_date
    end_date = period.end_date

    # Étape 1 : Quote-part
    quotepart = get_quotepart_from_meals(start_date, end_date, db)

    # Étape 2 : Charges théoriques
    charges = calculate_charges_theoriques(start_date, end_date, db, quotepart)

    # Étape 3 : Financement réel
    financement = calculate_financement_reel(start_date, end_date, db)

    # Calcul du brico (contribution immobilier) - Loïc seul
    brico_expenses = db.query(Expense).filter(
        Expense.category == "brico",
        Expense.account_id == 1,
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()
    brico_total = sum((Decimal(str(e.amount)) for e in brico_expenses), Decimal("0.00"))

    # Calcul des dettes (attribuées au compte qui les a créées)
    dettes_expenses = db.query(Expense).filter(
        Expense.category == "dette",
        Expense.date >= start_date,
        Expense.date <= end_date,
    ).all()

    dettes_loic = Decimal("0.00")
    dettes_alice = Decimal("0.00")
    dettes_detail = []

    for exp in dettes_expenses:
        amount = Decimal(str(exp.amount))
        # Les dettes sont attribuées au compte qui les a créées
        if exp.account_id == 1:  # Loïc
            dettes_loic += amount
            dettes_detail.append({
                "label": exp.label,
                "loic": float(amount),
                "alice": 0.0,
            })
        elif exp.account_id == 2:  # Alice
            dettes_alice += amount
            dettes_detail.append({
                "label": exp.label,
                "loic": 0.0,
                "alice": float(amount),
            })
        else:  # Compte commun (Fortuneo) - répartir 50/50
            half = (amount / Decimal("2")).quantize(Decimal("0.01"))
            dettes_loic += half
            dettes_alice += half
            dettes_detail.append({
                "label": exp.label,
                "loic": float(half),
                "alice": float(half),
            })

    # Étape 4 : Solde final
    solde_loic = Decimal(str(financement["loic"])) - Decimal(str(charges["loic"]))
    solde_alice = Decimal(str(financement["alice"])) - Decimal(str(charges["alice"]))

    # Conclusion : actions concrètes à effectuer
    # Format: virements avec libellés "regule<date>" pour traçabilité
    from datetime import date as date_class
    today = date_class.today().strftime("%d%m%Y")

    solde_total = solde_loic + solde_alice
    deficit_compte = abs(solde_total)  # Le vrai déficit du compte Fortuneo

    if solde_loic < 0 and solde_alice >= 0:
        # Loïc est débiteur, Alice est créditrice
        loic_debt = abs(solde_loic)
        alice_credit = solde_alice
        conclusion = f"✅ Loïc: Virement {loic_debt.quantize(Decimal('0.01'))}€ vers compte (libellé: regule{today})\n✅ Alice: Reçoit {alice_credit.quantize(Decimal('0.01'))}€ du compte (libellé: regule{today})"
    elif solde_alice < 0 and solde_loic >= 0:
        # Alice est débitrice, Loïc est créditeur
        alice_debt = abs(solde_alice)
        loic_credit = solde_loic
        conclusion = f"✅ Alice: Virement {alice_debt.quantize(Decimal('0.01'))}€ vers compte (libellé: regule{today})\n✅ Loïc: Reçoit {loic_credit.quantize(Decimal('0.01'))}€ du compte (libellé: regule{today})"
    elif solde_loic < 0 and solde_alice < 0:
        # Les deux sont débiteurs (rare)
        loic_debt = abs(solde_loic)
        alice_debt = abs(solde_alice)
        conclusion = f"✅ Loïc: Virement {loic_debt.quantize(Decimal('0.01'))}€ vers compte (libellé: regule{today})\n✅ Alice: Virement {alice_debt.quantize(Decimal('0.01'))}€ vers compte (libellé: regule{today})"
    elif solde_loic > 0 and solde_alice > 0:
        # Les deux sont créditeurs (rare)
        loic_credit = solde_loic
        alice_credit = solde_alice
        conclusion = f"✅ Loïc: Reçoit {loic_credit.quantize(Decimal('0.01'))}€ du compte (libellé: regule{today})\n✅ Alice: Reçoit {alice_credit.quantize(Decimal('0.01'))}€ du compte (libellé: regule{today})"
    else:
        conclusion = "✅ Soldes équilibrés - Aucune action requise."

    return {
        "period_id": period_id,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "quotepart": {
            "loic": str(quotepart["loic"]),
            "alice": str(quotepart["alice"]),
        },
        "charges": charges,
        "financement": financement,
        "solde": {
            "loic": str(solde_loic.quantize(Decimal("0.01"))),
            "alice": str(solde_alice.quantize(Decimal("0.01"))),
        },
        "avances": {
            "loic": str(financement["loic"]),
            "alice": str(financement["alice"]),
        },
        "dettes": {
            "loic": float(dettes_loic),
            "alice": float(dettes_alice),
            "detail": dettes_detail,
        },
        "immo": {
            "loic": str(brico_total.quantize(Decimal("0.01"))),
        },
        "conclusion": conclusion,
    }
