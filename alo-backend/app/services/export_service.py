"""Service pour exporter les périodes en Markdown ultra-détaillé."""

from datetime import datetime
from decimal import Decimal
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models import Period, Expense, SharingEntry
from app.services.reequilibrage_calculator import calculate_reequilibrage


class ExportService:
    """Génère les exports Markdown ultra-détaillés des périodes."""

    def generate_period_markdown(self, period_id: int, db: Session) -> str:
        """Génère un export Markdown COMPLET avec TOUTES les données."""
        period = db.get(Period, period_id)
        if not period:
            raise ValueError(f"Période {period_id} non trouvée")

        reequilibrage = calculate_reequilibrage(period_id, db)
        # Chercher par dates (comme le rééquilibrage), pas par period_id
        expenses = db.query(Expense).filter(
            Expense.date >= period.start_date,
            Expense.date <= period.end_date
        ).order_by(Expense.date.asc()).all()
        sharing_entries = db.query(SharingEntry).join(Expense).filter(
            Expense.date >= period.start_date,
            Expense.date <= period.end_date
        ).all()

        # Préparer les variables pour éviter les f-string complexes
        quotepart_loic = float(reequilibrage.get('quotepart', {}).get('loic', 0)) * 100
        quotepart_alice = float(reequilibrage.get('quotepart', {}).get('alice', 0)) * 100
        total_expenses = sum(float(e.amount) for e in expenses)
        solde_loic = float(reequilibrage.get('solde', {}).get('loic', 0))
        solde_alice = float(reequilibrage.get('solde', {}).get('alice', 0))
        charges_loic = float(reequilibrage.get('charges', {}).get('loic', 0))
        charges_alice = float(reequilibrage.get('charges', {}).get('alice', 0))
        financing_loic = float(reequilibrage.get('financement', {}).get('loic', 0))
        financing_alice = float(reequilibrage.get('financement', {}).get('alice', 0))

        # HEADER
        md = f"""# 📊 EXPORT COMPLET — {period.name}

**Période :** {period.start_date} à {period.end_date}
**Statut :** {period.status.upper()}
**Généré :** {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}
**Nombre de dépenses :** {len(expenses)}
**Nombre de partages :** {len(sharing_entries)}

---

## 📋 TABLE DES MATIÈRES

1. Résumé exécutif
2. Synthèse financière
3. Détail complet des dépenses
4. Partages calculés (TOUS)
5. Analyse par catégorie
6. Analyse par compte
7. Analyse par source
8. Virements détail
9. Télégrammes détail
10. Investissements (Brico)
11. Statistiques repas
12. Conclusion

---

## 1️⃣ RÉSUMÉ EXÉCUTIF

**Quote-part (Ratio de consommation repas):**
- Loïc (Gourmich): {quotepart_loic:.2f}%
- Alice (Tigresse): {quotepart_alice:.2f}%

**Synthèse financière:**
- Total dépenses: {total_expenses:.2f}€
- Solde Loïc: {solde_loic:.2f}€
- Solde Alice: {solde_alice:.2f}€

**Conclusion:** {reequilibrage.get('conclusion', 'N/A')}

---

## 2️⃣ SYNTHÈSE FINANCIÈRE

### Charges Théoriques (ce que chacun DEVRAIT payer):
| Personne | Montant | % du total |
|----------|---------|-----------|
| Loïc | {charges_loic:.2f}€ | {100*charges_loic/(charges_loic+charges_alice+0.01):.1f}% |
| Alice | {charges_alice:.2f}€ | {100*charges_alice/(charges_loic+charges_alice+0.01):.1f}% |
| **TOTAL** | **{charges_loic+charges_alice:.2f}€** | **100%** |

### Financement Réel (ce que chacun A payé):
| Personne | Montant | % du total |
|----------|---------|-----------|
| Loïc | {financing_loic:.2f}€ | {100*financing_loic/(financing_loic+financing_alice+0.01):.1f}% |
| Alice | {financing_alice:.2f}€ | {100*financing_alice/(financing_loic+financing_alice+0.01):.1f}% |
| **TOTAL** | **{financing_loic+financing_alice:.2f}€** | **100%** |

### Solde Final (Qui doit payer qui):
| Personne | Solde | Situation |
|----------|-------|-----------|
| Loïc | {solde_loic:.2f}€ | {"A avancé" if solde_loic > 0 else "Doit rembourser" if solde_loic < 0 else "Équilibré"} |
| Alice | {solde_alice:.2f}€ | {"A avancé" if solde_alice > 0 else "Doit rembourser" if solde_alice < 0 else "Équilibré"} |

---

## 3️⃣ DÉTAIL COMPLET DES DÉPENSES (TOUTES - {len(expenses)} opérations)

| # | Date | Auteur | Label | Montant | Catégorie | Partage | Commentaire |
|---|------|--------|-------|---------|-----------|---------|-------------|
"""
        for i, exp in enumerate(expenses, 1):
            author = "Loïc" if exp.account_id == 1 else "Alice" if exp.account_id == 2 else "Fortuneo"
            comment = exp.comment if exp.comment else "-"
            md += f"| {i} | {exp.date} | {author} | {exp.label} | {exp.amount:.2f}€ | {exp.category} | {exp.sharing_mode} | {comment} |\n"

        # PARTAGES DÉTAIL
        md += f"""
---

## 4️⃣ PARTAGES CALCULÉS (TOUS - {len(sharing_entries)} entrées)

| # | Date | Dépense | Montant | Personne | Ratio | Règle |
|---|------|---------|---------|----------|-------|-------|
"""
        for i, entry in enumerate(sharing_entries, 1):
            exp = db.get(Expense, entry.expense_id)
            person = "Loïc" if entry.person == "adulte1" else "Alice"
            md += f"| {i} | {exp.date} | {exp.label} | {entry.amount:.2f}€ | {person} | {entry.ratio:.2%} | {entry.rule_used} |\n"

        # ANALYSE PAR CATÉGORIE
        expenses_by_category = defaultdict(lambda: {"Loïc": 0, "Alice": 0, "count": 0, "items": []})
        for exp in expenses:
            cat = exp.category or "non-catégorisé"
            author = "Loïc" if exp.account_id == 1 else "Alice" if exp.account_id == 2 else "Fortuneo"
            amount = float(exp.amount)
            if author in ["Loïc", "Alice"]:
                expenses_by_category[cat][author] += amount
                expenses_by_category[cat]["count"] += 1
                expenses_by_category[cat]["items"].append((exp.date, exp.label, amount, author))

        md += """
---

## 5️⃣ ANALYSE PAR CATÉGORIE

| Catégorie | Loïc | Alice | Total | Opérations |
|-----------|------|-------|-------|-----------|
"""
        for cat in sorted(expenses_by_category.keys()):
            data = expenses_by_category[cat]
            total = data["Loïc"] + data["Alice"]
            md += f"| {cat} | {data['Loïc']:.2f}€ | {data['Alice']:.2f}€ | {total:.2f}€ | {data['count']} |\n"

        # DÉTAIL CHAQUE CATÉGORIE
        for cat in sorted(expenses_by_category.keys()):
            data = expenses_by_category[cat]
            md += f"""

### Détail {cat}:
| Date | Label | Montant | Auteur |
|------|-------|---------|--------|
"""
            for date, label, amount, author in sorted(data["items"]):
                md += f"| {date} | {label} | {amount:.2f}€ | {author} |\n"

        # ANALYSE PAR COMPTE
        md += """
---

## 6️⃣ ANALYSE PAR COMPTE

"""
        expenses_by_account = {"Loïc": {"count": 0, "total": 0}, "Alice": {"count": 0, "total": 0}, "Fortuneo": {"count": 0, "total": 0}}
        for exp in expenses:
            author = "Loïc" if exp.account_id == 1 else "Alice" if exp.account_id == 2 else "Fortuneo"
            expenses_by_account[author]["count"] += 1
            expenses_by_account[author]["total"] += float(exp.amount)

        for account in ["Loïc", "Alice", "Fortuneo"]:
            data = expenses_by_account[account]
            md += f"**{account}:** {data['count']} dépenses = {data['total']:.2f}€\n"

        # ANALYSE PAR SOURCE
        md += """

---

## 7️⃣ ANALYSE PAR SOURCE

"""
        expenses_by_source = defaultdict(lambda: {"count": 0, "total": 0})
        for exp in expenses:
            source = exp.source or "manuel"
            expenses_by_source[source]["count"] += 1
            expenses_by_source[source]["total"] += float(exp.amount)

        for source in sorted(expenses_by_source.keys()):
            data = expenses_by_source[source]
            md += f"**{source}:** {data['count']} dépenses = {data['total']:.2f}€\n"

        # VIREMENTS DÉTAIL
        md += """

---

## 8️⃣ VIREMENTS (DÉTAIL)

"""
        virements = [e for e in expenses if e.category == "virement"]
        if virements:
            total_virements = sum(float(e.amount) for e in virements)
            md += f"**Total virements:** {len(virements)} opérations = {total_virements:.2f}€\n\n"
            md += "| Date | Label | Montant | Auteur |\n|------|-------|---------|--------|\n"
            for vir in virements:
                author = "Loïc" if vir.account_id == 1 else "Alice"
                md += f"| {vir.date} | {vir.label} | {vir.amount:.2f}€ | {author} |\n"
        else:
            md += "*Aucun virement dans cette période.*\n"

        # TÉLÉGRAMMES DÉTAIL
        md += """

---

## 9️⃣ TÉLÉGRAMMES (DÉTAIL)

"""
        telegrams = [e for e in expenses if e.source == "telegram"]
        if telegrams:
            total_telegrams = sum(float(e.amount) for e in telegrams)
            md += f"**Total Telegram:** {len(telegrams)} opérations = {total_telegrams:.2f}€\n\n"
            md += "| Date | Label | Montant | Catégorie | Auteur |\n|------|-------|---------|-----------|--------|\n"
            for tg in telegrams:
                author = "Loïc" if tg.account_id == 1 else "Alice"
                md += f"| {tg.date} | {tg.label} | {tg.amount:.2f}€ | {tg.category} | {author} |\n"
        else:
            md += "*Aucun Telegram dans cette période.*\n"

        # INVESTISSEMENTS (BRICO)
        md += """

---

## 🔟 INVESTISSEMENTS (BRICO)

"""
        brico_exp = [e for e in expenses if e.category == "brico"]
        if brico_exp:
            brico_by_author = defaultdict(float)
            for exp in brico_exp:
                author = "Loïc" if exp.account_id == 1 else "Alice"
                brico_by_author[author] += float(exp.amount)

            total_brico = sum(float(e.amount) for e in brico_exp)
            md += f"**Total Brico:** {total_brico:.2f}€\n\n"
            for author in ["Loïc", "Alice"]:
                md += f"- **{author}:** {brico_by_author.get(author, 0):.2f}€\n"

            md += "\n**Détail:**\n| Date | Label | Montant | Auteur |\n|------|-------|---------|--------|\n"
            for exp in brico_exp:
                author = "Loïc" if exp.account_id == 1 else "Alice"
                md += f"| {exp.date} | {exp.label} | {exp.amount:.2f}€ | {author} |\n"
        else:
            md += "*Aucun investissement (brico) dans cette période.*\n"

        # INVESTISSEMENT RIVIÈRE (Bricolage de Loïc - TOTAL)
        md += """

---

## 1️⃣1️⃣ INVESTISSEMENT RIVIÈRE (Bricolage - Loïc)

**Total depuis le début des comptes:**
"""
        # Récupérer TOUS les brico de Loïc (pas juste ceux de la période)
        all_riviere = [e for e in db.query(Expense).filter(
            Expense.account_id == 1,
            Expense.category == "brico"
        ).all()]

        total_all_riviere = sum(float(e.amount) for e in all_riviere)
        md += f"\n**{total_all_riviere:.2f}€** ({len(all_riviere)} opérations)\n"

        # STATISTIQUES REPAS
        md += f"""

---

## 1️⃣2️⃣ STATISTIQUES REPAS

**Quote-part Loïc (Gourmich):** {quotepart_loic:.2f}%
**Quote-part Alice (Tigresse):** {quotepart_alice:.2f}%

*Détail des repas en période: Voir section rééquilibrage*

---

## 1️⃣3️⃣ CONCLUSION FINALE

{reequilibrage.get('conclusion', 'Aucune conclusion')}

---

_Généré par ALO le {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}_
_Export complet avec toutes les données_
"""
        return md
