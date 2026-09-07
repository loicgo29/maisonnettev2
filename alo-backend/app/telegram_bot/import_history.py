"""
Script pour importer l'historique des messages des groupes Telegram dans ALO
Utilise Telethon pour accéder à l'historique complet (pas juste les nouveaux messages)
"""

import asyncio
import re
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
import httpx
from datetime import date

# Credentials Telegram
API_ID = 30366159
API_HASH = "165a968c795273574e30d881355ba3f7"
PHONE = "+33781103889"

# IDs des groupes
GROUP_GOURMICH = -718152023      # Comptes Alo (Loïc)
GROUP_ALICE = -4165469698        # Alo Dépenses Alice
GROUP_ALICE_QUOTEPART = -5164479851   # Alo Quote Part (Alice)
GROUP_ALICE_5050 = -5151201098        # Alo 50/50 (Alice)
GROUP_LOIC = -4118780090              # Alo Dépenses Loïc

# API ALO
API_URL = "http://localhost:8021/api"

# Mapping groupe → compte
GROUP_TO_ACCOUNT = {
    GROUP_GOURMICH: {"name": "loic", "id": 1},
    GROUP_ALICE: {"name": "alice", "id": 2},
    GROUP_ALICE_QUOTEPART: {"name": "alice (quotepart)", "id": 2},
    GROUP_ALICE_5050: {"name": "alice (50/50)", "id": 2},
    GROUP_LOIC: {"name": "loic (dépenses)", "id": 1}
}


def parse_expense(text: str):
    """Parse un message pour extraire montant et description"""
    if not text or not text.strip():
        return None

    # Patterns supportés
    patterns = [
        # "Carrefour 47.50"
        r'^([a-zA-Z\s\-\.éèôûâêîéàù]+?)\s+([\d,\.]+)[\s€]*$',
        # "47.50 Carrefour"
        r'^([\d,\.]+)[\s€]*(.+)$',
        # "47,50 - Courses"
        r'^([\d,\.]+)\s*-\s*([a-zA-Z\s\-\.éèôûâêîéàù]+)$',
    ]

    for pattern in patterns:
        match = re.search(pattern, text.strip(), re.IGNORECASE)
        if match:
            parts = [p.strip() for p in match.groups()]

            # Détermine lequel est le montant
            for part in parts:
                cleaned = part.replace(',', '.')
                if re.match(r'^\d+\.?\d*$', cleaned):
                    try:
                        amount = float(cleaned)
                        label = next(p for p in parts if p != part)

                        if amount > 0 and len(label) > 0:
                            return {
                                "label": label[:50],  # Max 50 caractères
                                "amount": amount
                            }
                    except (ValueError, StopIteration):
                        continue

    return None


def classify_category(label: str) -> str:
    """Auto-classifie une dépense selon son libellé"""
    QUOTEPART_KEYWORDS = [
        "biocoop", "carrefour", "leclerc", "auchan", "intermarché", "carrefour market",
        "courses", "marché", "marche", "sefa", "kerbio", "boulangerie", "boucherie",
        "fromagerie", "alimentation", "épicerie", "fruits", "légumes", "viande", "poisson",
        "fromage", "pain", "baguette", "lait", "oeufs", "beurre", "crème", "huile",
        "café", "thé", "chocolat", "sucre", "farine", "riz", "pâtes", "conserves",
        "crowdfarming", "la fourche", "fourche", "cantine", "restaurant",
        "essence", "carburant", "gazole", "diesel", "pharmacie",
        "supermarchés", "magasin", "action", "grande surface",
        "câble", "ampoule", "électrique", "électronique", "seche cheveux", "appareil"
    ]

    BRICO_KEYWORDS = [
        "leroy", "merlin", "castorama", "brico", "bricodépôt", "casto", "mr bricolage",
        "amazon", "cedeo", "placo", "carrelage", "peinture", "vernis", "enduit",
        "vis", "clou", "maçonnerie", "plomberie", "électricité", "chauffage",
        "fenêtre", "porte", "serrure", "poignée", "robinet", "mitigeur", "tuyau",
        "tuyauterie", "béton", "sable", "ciment", "pierre", "brique", "tuile",
        "terrasse", "dalle", "escalier", "rampe", "barrière", "grillage",
        "outil", "perceuse", "scie", "marteau", "tournevis", "clé", "lime",
        "burin", "chisel", "meuleuse", "sauteuse", "rabot", "établi"
    ]

    DETTE_KEYWORDS = [
        "doit", "dette", "prêt", "remboursement", "remboursé", "rembourser",
        "emprunté", "emprunter", "avance", "avancé", "retour", "rendre",
        "rendez", "tu dois", "je dois", "il doit", "elle doit"
    ]

    if not label:
        return "50/50"

    label_lower = label.lower()

    for keyword in DETTE_KEYWORDS:
        if keyword in label_lower:
            return "dette"

    for keyword in BRICO_KEYWORDS:
        if keyword in label_lower:
            return "brico"

    for keyword in QUOTEPART_KEYWORDS:
        if keyword in label_lower:
            return "quotepart"

    return "50/50"


async def create_expense(label: str, amount: float, account_id: int, msg_date):
    """Crée une dépense via l'API ALO"""
    try:
        payload = {
            "date": msg_date.isoformat(),
            "label": label,
            "amount": str(amount),
            "category": classify_category(label),
            "source": "telegram",
            "account_id": account_id
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/expenses",
                json=payload,
                timeout=5.0
            )

            if response.status_code == 201:
                return True
            else:
                print(f"⚠️ Erreur API: {response.status_code} - {label} {amount}€")
                return False

    except Exception as e:
        print(f"❌ Erreur création dépense: {e}")
        return False


async def import_group_history(client: TelegramClient, group_id: int, start_date=None, end_date=None):
    """Importe l'historique d'un groupe (optionnel: filtrer par date)"""
    account = GROUP_TO_ACCOUNT.get(group_id)
    if not account:
        print(f"❌ Groupe inconnu: {group_id}")
        return

    print(f"\n📥 Récupération de l'historique du groupe {group_id} ({account['name']})...")
    if start_date or end_date:
        print(f"   📅 Plage: {start_date or 'début'} → {end_date or 'fin'}")

    created_count = 0
    skipped_count = 0
    filtered_count = 0

    try:
        async for message in client.iter_messages(group_id, limit=None):
            # Filtre par date si spécifiée
            msg_date = message.date.date()
            if start_date and msg_date < start_date:
                filtered_count += 1
                continue
            if end_date and msg_date > end_date:
                filtered_count += 1
                continue

            # Ignore les messages sans texte
            if not message.text:
                continue

            # Parse la dépense
            expense = parse_expense(message.text)
            if not expense:
                skipped_count += 1
                continue

            # Crée la dépense
            success = await create_expense(
                label=expense["label"],
                amount=expense["amount"],
                account_id=account["id"],
                msg_date=msg_date
            )

            if success:
                created_count += 1
                print(f"✅ {msg_date} - {expense['label']} {expense['amount']}€ ({account['name']})")

    except Exception as e:
        print(f"❌ Erreur lors de la récupération: {e}")

    print(f"\n📊 Résumé {account['name']}:")
    print(f"   ✅ Créées: {created_count}")
    print(f"   ⏭️  Ignorées: {skipped_count}")
    if filtered_count > 0:
        print(f"   🔚 Hors plage: {filtered_count}")


async def main(start_date=None, end_date=None):
    """Lance l'import (optionnel: avec filtrage de dates)"""
    print(f"🔐 Connexion à Telegram en tant que {PHONE}...")

    client = TelegramClient('alo_session', API_ID, API_HASH)
    try:
        await client.connect()

        if not await client.is_user_authorized():
            print("❌ Session expirée, authentification requise")
            await client.send_code_request(PHONE)
            code = input('📌 Code reçu par SMS : ')
            try:
                await client.sign_in(PHONE, code)
            except SessionPasswordNeededError:
                pwd_2fa = input('🔑 Mot de passe 2FA : ')
                await client.sign_in(password=pwd_2fa)

        print("✅ Connecté à Telegram!\n")

        # Importe tous les groupes
        await import_group_history(client, GROUP_GOURMICH, start_date, end_date)
        await import_group_history(client, GROUP_ALICE, start_date, end_date)
        await import_group_history(client, GROUP_ALICE_QUOTEPART, start_date, end_date)
        await import_group_history(client, GROUP_ALICE_5050, start_date, end_date)
        await import_group_history(client, GROUP_LOIC, start_date, end_date)

        print("\n🎉 Import terminé!")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    import sys
    from datetime import date, timedelta

    # Récupère les dates en paramètre ou utilise des valeurs par défaut
    # Usage: python import_history.py [start_date] [end_date]
    # Ex: python import_history.py 2026-05-22 2026-05-24

    start_date = None
    end_date = None

    if len(sys.argv) > 1:
        try:
            start_date = date.fromisoformat(sys.argv[1])
            print(f"📅 Plage de départ: {start_date}")
        except ValueError:
            print(f"❌ Format de date invalide: {sys.argv[1]} (utilisez YYYY-MM-DD)")
            sys.exit(1)

    if len(sys.argv) > 2:
        try:
            end_date = date.fromisoformat(sys.argv[2])
            print(f"📅 Plage de fin: {end_date}")
        except ValueError:
            print(f"❌ Format de date invalide: {sys.argv[2]} (utilisez YYYY-MM-DD)")
            sys.exit(1)

    asyncio.run(main(start_date, end_date))
