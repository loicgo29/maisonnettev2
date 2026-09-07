"""
Script simple pour récupérer les IDs des groupes Telegram
Utilisation: python get_group_ids.py
"""

import os
from telegram import Update
from telegram.ext import Application, ContextTypes, MessageHandler, filters, CommandHandler

# Récupère le token depuis les variables d'env
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not TOKEN:
    print("❌ Erreur: TELEGRAM_BOT_TOKEN non défini")
    print("Utilise: export TELEGRAM_BOT_TOKEN='ton_token_ici'")
    exit(1)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Affiche l'ID du groupe et les infos du message"""
    chat = update.effective_chat

    print("\n" + "="*60)
    print(f"📱 Nouveau message reçu:")
    print(f"  ID du groupe: {chat.id}")
    print(f"  Nom du groupe: {chat.title}")
    print(f"  Type: {chat.type}")
    print(f"  Auteur: {update.effective_user.first_name}")
    print(f"  Message: {update.message.text}")
    print("="*60 + "\n")

    # Répond avec l'ID
    await update.message.reply_text(
        f"✅ ID du groupe: `{chat.id}`\n\n"
        f"Ajoute cette ligne à tes configurations:\n"
        f"`TELEGRAM_GROUP_ID={chat.id}`",
        parse_mode="Markdown"
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /start"""
    await update.message.reply_text(
        "👋 Bot diagnostic Telegram activé!\n\n"
        "J'affiche l'ID du groupe dans les logs.\n\n"
        "Envoie n'importe quel message et regarde le terminal."
    )


def main():
    """Lance le bot"""
    print("🤖 Bot diagnostic lancé...")
    print(f"Token: {TOKEN[:10]}...")
    print("En attente de messages...\n")

    app = Application.builder().token(TOKEN).build()

    # Handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Polling
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
