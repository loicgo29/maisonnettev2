"""
Bot Telegram principal - Écoute 2 groupes et crée des dépenses dans ALO
Groupes:
  - "Comptes Alo" (Gourmich)
  - "Alo Quote Part" (Tigresse)
"""

import os
import re
import logging
from telegram import Update
from telegram.ext import Application, ContextTypes, MessageHandler, filters, CommandHandler
import httpx
from datetime import date

# Configuration
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_URL = os.getenv("API_URL", "http://localhost:8000/api")

# IDs des groupes (à remplir ou déduire)
GROUP_IDS = {
    "comptes_alo": int(os.getenv("TELEGRAM_GROUP_GOURMICH", 0)),  # Gourmich
    "alo_quote_part": int(os.getenv("TELEGRAM_GROUP_TIGRESSE", 0))  # Tigresse
}

# Mapping groupe → compte (name et ID)
# -718152023 (Comptes Alo) = Loic paie
# -4165469698 (Alo Dépenses Alice) = Alice paie
GROUP_TO_ACCOUNT = {
    GROUP_IDS["comptes_alo"]: {"name": "Loic", "id": 1},
    GROUP_IDS["alo_quote_part"]: {"name": "Alice", "id": 2}
}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not TOKEN:
    logger.error("❌ TELEGRAM_BOT_TOKEN non défini!")
    exit(1)


async def parse_expense_message(text: str) -> dict:
    """Parse un message pour extraire montant et description

    Formats supportés:
    - "Carrefour 47.50"
    - "47.50 Carrefour"
    - "47,50 Courses"
    - "Transport - 12€"
    - "Essence 60"
    """

    if not text or not text.strip():
        return None

    # Patterns: montant + description
    patterns = [
        # "Carrefour 47.50"
        r'^([a-zA-Z\s\-\.éè]+?)\s+([\d,\.]+)$',
        # "47.50 Carrefour"
        r'^([\d,\.]+)\s+([a-zA-Z\s\-\.éè]+)$',
        # "47,50 - Courses"
        r'^([\d,\.]+)\s*-\s*([a-zA-Z\s\-\.éè]+)$',
        # "Description - 47.50€"
        r'^([a-zA-Z\s\-\.éè]+?)\s*-\s*([\d,\.]+)\s*€?$',
    ]

    for pattern in patterns:
        match = re.search(pattern, text.strip(), re.IGNORECASE)
        if match:
            parts = [p.strip() for p in match.groups()]

            # Détermine lequel est le montant
            for part in parts:
                cleaned = part.replace(',', '.')
                if re.match(r'^\d+\.?\d*$', cleaned):
                    amount = float(cleaned)
                    label = next(p for p in parts if p != part)

                    if amount > 0 and len(label) > 0:
                        return {
                            "label": label,
                            "amount": amount
                        }

    return None


async def create_expense(label: str, amount: float, account: dict, db=None) -> bool:
    """Crée une dépense via l'API ALO"""

    try:
        payload = {
            "date": str(date.today()),
            "label": label,
            "amount": str(amount),
            "category": "divers",
            "source": "telegram",
            "account_id": account["id"]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/expenses",
                json=payload,
                timeout=5.0
            )

            if response.status_code == 201:
                data = response.json()
                logger.info(f"✅ Dépense créée: {label} {amount}€ ({account['name']})")
                return True
            else:
                logger.error(f"❌ Erreur API: {response.status_code}")
                return False

    except Exception as e:
        logger.error(f"❌ Erreur création dépense: {e}")
        return False


async def handle_group_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Traite les messages des groupes"""

    chat = update.effective_chat
    message_text = update.message.text

    logger.info(f"📝 Traitement du message: '{message_text}' du groupe {chat.id}")

    # Détermine le compte
    account = GROUP_TO_ACCOUNT.get(chat.id)
    if not account:
        logger.warning(f"⚠️ Groupe non reconnu: {chat.id} ({chat.title})")
        return

    logger.info(f"📌 Compte trouvé: {account}")

    # Parse la dépense
    expense = await parse_expense_message(message_text)
    if not expense:
        logger.info(f"⏭️ Message ignoré (format invalide)")
        return  # Message ignoré (pas un format de dépense)

    logger.info(f"✍️ Dépense parsée: {expense}")

    # Crée la dépense
    success = await create_expense(
        label=expense["label"],
        amount=expense["amount"],
        account=account
    )

    # Répond dans le groupe
    if success:
        await update.message.reply_text(
            f"✅ Dépense enregistrée: {expense['label']} {expense['amount']}€"
        )
    else:
        await update.message.reply_text(
            f"❌ Erreur lors de l'enregistrement"
        )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /start"""
    await update.message.reply_text(
        "🤖 Bot ALO Dépenses activé!\n\n"
        "Envoie les dépenses au format:\n"
        "  • Carrefour 47.50\n"
        "  • 60€ Essence\n"
        "  • Transport - 12.50\n\n"
        "Les dépenses seront enregistrées automatiquement."
    )


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /status"""

    accounts_info = "\n".join([
        f"  • Gourmich: {GROUP_IDS['comptes_alo']}",
        f"  • Tigresse: {GROUP_IDS['alo_quote_part']}"
    ])

    await update.message.reply_text(
        f"📊 Statut du bot:\n\n"
        f"API: {API_URL}\n"
        f"Groupes configurés:\n{accounts_info}\n\n"
        f"Token: {TOKEN[:20]}..."
    )


async def historique(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /historique - affiche les dépenses depuis le 1er janvier 2026"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_URL}/expenses?limit=1000", timeout=5.0)

            if response.status_code != 200:
                await update.message.reply_text("❌ Erreur lors de la récupération des dépenses")
                return

            expenses = response.json()

            if not expenses:
                await update.message.reply_text("📭 Aucune dépense")
                return

            filtered = expenses  # Affiche TOUTES les dépenses

            # Groupe par compte (SEULEMENT Loïc et Alice)
            loic = [e for e in filtered if e.get('account_id') == 1]
            alice = [e for e in filtered if e.get('account_id') == 2]

            total_loic = sum(float(e['amount']) for e in loic)
            total_alice = sum(float(e['amount']) for e in alice)
            total_general = total_loic + total_alice

            message = "📊 Historique des dépenses\n\n"

            # Loïc
            message += f"👨 **Loïc** : {total_loic:.2f}€ ({len(loic)} dépenses)\n"
            for e in sorted(loic, key=lambda x: x['date'], reverse=True)[:5]:
                message += f"  • {e['date']} - {e['label']} : {e['amount']}€\n"
            if len(loic) > 5:
                message += f"  ... et {len(loic) - 5} autres\n"
            message += "\n"

            # Alice
            message += f"👩 **Alice** : {total_alice:.2f}€ ({len(alice)} dépenses)\n"
            for e in sorted(alice, key=lambda x: x['date'], reverse=True)[:5]:
                message += f"  • {e['date']} - {e['label']} : {e['amount']}€\n"
            if len(alice) > 5:
                message += f"  ... et {len(alice) - 5} autres\n"
            message += "\n"

            message += f"💰 **Total** : {total_general:.2f}€"

            await update.message.reply_text(message)

    except Exception as e:
        logger.error(f"❌ Erreur historique: {e}")
        await update.message.reply_text(f"❌ Erreur: {e}")


def main():
    """Lance le bot"""

    # Vérifie la configuration
    if not GROUP_IDS["comptes_alo"] or not GROUP_IDS["alo_quote_part"]:
        logger.error("❌ IDs des groupes non configurés!")
        logger.info("Définis les variables d'env:")
        logger.info("  TELEGRAM_GROUP_GOURMICH=-100...")
        logger.info("  TELEGRAM_GROUP_TIGRESSE=-100...")
        exit(1)

    logger.info("🤖 Bot ALO Dépenses lancé")
    logger.info(f"📁 Groupes:")
    logger.info(f"   Gourmich: {GROUP_IDS['comptes_alo']}")
    logger.info(f"   Tigresse: {GROUP_IDS['alo_quote_part']}")
    logger.info(f"🔗 API: {API_URL}")
    logger.info("En attente de messages...\n")

    app = Application.builder().token(TOKEN).build()

    # Handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("historique", historique))
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND & (
            filters.Chat(GROUP_IDS["comptes_alo"]) |
            filters.Chat(GROUP_IDS["alo_quote_part"])
        ),
        handle_group_message
    ))

    # Lance le polling
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
