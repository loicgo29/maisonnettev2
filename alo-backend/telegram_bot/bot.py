"""
Telegram bot pour ALO - Gestion des dépenses familiales.
À lancer en process séparé : uv run python -m telegram_bot.bot
"""

import os
import sys
import logging
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
)

from .handlers import start, last_expenses, month_total, handle_message

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def main():
    """Démarre le bot avec polling."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Erreur : TELEGRAM_BOT_TOKEN non défini dans .env")
        sys.exit(1)

    app = Application.builder().token(token).build()

    # Handlers de commandes
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("last", last_expenses))
    app.add_handler(CommandHandler("total", month_total))

    # Handler pour les messages libres (tout ce qui n'est pas une commande)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Démarre le polling
    print("Bot Telegram démarré. Appuie sur Ctrl+C pour arrêter.")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
