from telegram import Update
from telegram.ext import ContextTypes
from pathlib import Path
import sys

# Ajoute le chemin pour importer les services de l'app
app_dir = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(app_dir))

from .parser import parse_expense_message
from .client import APIClient
from services.categorizer import Categorizer


client = APIClient()
categorizer = Categorizer()

# Le groupe "Comptes Alo" est partagé : Loïc ET Alice y postent (vérifié le
# 2026-09-13, échantillon 100 messages : 79 Loïc / 19 Alitché-Alice). Sans ce
# mapping, le bot n'envoyait aucun account_id et toutes les dépenses
# restaient non attribuées (account_id NULL en base), quel que soit
# l'expéditeur réel.
TELEGRAM_SENDER_TO_ACCOUNT = {
    1556868078: 1,  # Loic
    1590532553: 2,  # Alitché (Alice)
}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Commande /start."""
    await update.message.reply_text(
        "Bienvenue à ALO - Gestion des dépenses familiales!\n\n"
        "Envoie moi une dépense sous l'une de ces formes :\n"
        "  • Lidl 47.30\n"
        "  • 47,50 Courses\n"
        "  • Transport - 12€\n\n"
        "Commandes disponibles:\n"
        "  /last — 5 dernières dépenses\n"
        "  /total — total du mois\n"
    )


async def last_expenses(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Commande /last — affiche les 5 dernières dépenses."""
    expenses = await client.get_recent_expenses(limit=5)
    if not expenses:
        await update.message.reply_text("Impossible de récupérer les dépenses.")
        return

    if not expenses:
        await update.message.reply_text("Aucune dépense.")
        return

    text = "📊 5 dernières dépenses :\n\n"
    for exp in expenses:
        text += f"• {exp['label']} : {exp['amount']}€ ({exp['date']})\n"

    await update.message.reply_text(text)


async def month_total(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Commande /total — affiche le total du mois."""
    result = await client.get_month_total()
    if not result:
        await update.message.reply_text("Impossible de calculer le total.")
        return

    text = f"💰 Total du mois : {result['total']:.2f}€ ({result['count']} dépenses)"
    await update.message.reply_text(text)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Traite les messages libres (dépenses)."""
    text = update.message.text
    parsed = parse_expense_message(text)

    if not parsed:
        await update.message.reply_text(
            "Je n'ai pas compris. Envoie une dépense sous la forme :\n"
            "  Lidl 47.30\n"
            "ou /start pour l'aide."
        )
        return

    # Catégorise automatiquement
    category = categorizer.categorize(parsed.label)

    # Attribution par expéditeur réel du message, pas par le groupe (partagé).
    account_id = TELEGRAM_SENDER_TO_ACCOUNT.get(update.message.from_user.id)

    # Importe la dépense
    result = await client.import_telegram_expense(
        label=parsed.label,
        amount=parsed.amount,
        category=category,
        comment=parsed.comment,
        account_id=account_id,
    )

    if result:
        await update.message.reply_text(
            f"✅ Dépense enregistrée :\n"
            f"{parsed.label} : {parsed.amount}€\n"
            f"Catégorie : {category}"
        )
    else:
        await update.message.reply_text(
            f"❌ Erreur lors de l'enregistrement.\n"
            f"Vérifie que l'API est accessible."
        )
