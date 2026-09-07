from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date
from typing import Optional
from app.database import get_db
from app.models import Expense
from app.schemas.imports import TelegramImportRequest
from app.schemas.expense import ExpenseResponse
from app.services.sharing_calculator import SharingCalculator
from app.services.quotepart_importer import parse_quotepart_csv
from app.services.categorizer import Categorizer
from app.services.csv_importer import CsvImporter

router = APIRouter()
calculator = SharingCalculator()


@router.post("/telegram", response_model=ExpenseResponse, status_code=201)
async def import_telegram_expense(
    req: TelegramImportRequest,
    db: Session = Depends(get_db),
):
    """
    Importe une dépense depuis Telegram.
    Crée une dépense en draft avec répartition 50/50 par défaut.
    """
    try:
        amount = Decimal(req.amount.replace(',', '.'))
    except Exception:
        raise HTTPException(status_code=400, detail="Montant invalide")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Montant doit être > 0")

    # Catégorie par défaut : "divers"
    category = req.category or "divers"

    # Crée la dépense
    db_expense = Expense(
        date=req.date,
        amount=amount,
        label=req.label,
        category=category,
        source="telegram",
        status="draft",
        comment=req.comment,
    )
    db.add(db_expense)
    db.flush()

    # Calcule le partage (50/50 par défaut)
    sharing_entries = calculator.calculate_sharing(db_expense, db)
    for entry in sharing_entries:
        db.add(entry)

    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.post("/csv", status_code=201)
async def import_csv_expenses(
    db: Session = Depends(get_db),
):
    """
    À implémenter : import CSV depuis export bancaire.
    """
    raise HTTPException(status_code=501, detail="À implémenter")


# ============ Endpoints pour la page d'import UI ============


# Stockage temporaire du phone_code_hash
_telegram_auth_state = {}


@router.post("/telegram/auth/start")
async def telegram_auth_start():
    """
    Initie l'authentification Telegram (envoie le code SMS)
    """
    from telethon import TelegramClient

    API_ID = 30366159
    API_HASH = "165a968c795273574e30d881355ba3f7"
    PHONE = "+33781103889"

    try:
        client = TelegramClient('alo_session', API_ID, API_HASH)
        await client.connect()

        if await client.is_user_authorized():
            await client.disconnect()
            return {"status": "already_authorized", "message": "Déjà connecté à Telegram"}

        # Envoie le code SMS et récupère le hash
        result = await client.send_code_request(PHONE)
        _telegram_auth_state['phone_code_hash'] = result.phone_code_hash

        await client.disconnect()

        return {
            "status": "code_sent",
            "message": "Code SMS envoyé à +33781103889",
            "phone": PHONE
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/telegram/auth/confirm")
async def telegram_auth_confirm(code: str):
    """
    Confirme l'authentification avec le code SMS
    """
    from telethon import TelegramClient
    from telethon.errors import SessionPasswordNeededError

    API_ID = 30366159
    API_HASH = "165a968c795273574e30d881355ba3f7"
    PHONE = "+33781103889"

    try:
        if 'phone_code_hash' not in _telegram_auth_state:
            raise HTTPException(status_code=400, detail="Veuillez d'abord cliquer sur 'S'authentifier'")

        client = TelegramClient('alo_session', API_ID, API_HASH)
        await client.connect()

        try:
            await client.sign_in(
                PHONE,
                code,
                phone_code_hash=_telegram_auth_state['phone_code_hash']
            )
        except SessionPasswordNeededError:
            await client.disconnect()
            return {
                "status": "2fa_required",
                "message": "2FA requis - veuillez relancer le script en CLI"
            }

        # Nettoyage
        del _telegram_auth_state['phone_code_hash']
        await client.disconnect()

        return {
            "status": "authenticated",
            "message": "✅ Authentification réussie!"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Code invalide: {str(e)}")


@router.post("/telegram/preview")
async def telegram_preview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Affiche un aperçu des données Telegram qui seront importées
    Filtre les doublons qui existent déjà
    """
    from telethon import TelegramClient
    from datetime import datetime as dt
    import re

    API_ID = 30366159
    API_HASH = "165a968c795273574e30d881355ba3f7"
    PHONE = "+33781103889"

    groups = {
        -718152023: {"name": "loic", "id": 1},
        -4165469698: {"name": "alice", "id": 2},
        -5164479851: {"name": "alice (quotepart)", "id": 2},
        -5151201098: {"name": "alice (50/50)", "id": 2},
        -4118780090: {"name": "loic (dépenses)", "id": 1},
    }

    expenses_preview = []
    duplicates_found = 0

    try:
        client = TelegramClient('alo_session', API_ID, API_HASH)
        await client.connect()

        if not await client.is_user_authorized():
            await client.disconnect()
            raise HTTPException(status_code=401, detail="Session expirée")

        for group_id, account in groups.items():
            try:
                async for message in client.iter_messages(group_id, limit=None):
                    if not message.text:
                        continue

                    msg_date = message.date.date()
                    if start_date and msg_date < dt.fromisoformat(start_date).date():
                        continue
                    if end_date and msg_date > dt.fromisoformat(end_date).date():
                        continue

                    # Parse
                    patterns = [
                        r'^([a-zA-Z\s\-\.éèôûâêîéàù]+?)\s+([\d,\.]+)[\s€]*$',
                        r'^([\d,\.]+)[\s€]*(.+)$',
                        r'^([\d,\.]+)\s*-\s*([a-zA-Z\s\-\.éèôûâêîéàù]+)$',
                    ]

                    parsed = None
                    for pattern in patterns:
                        match = re.search(pattern, message.text.strip(), re.IGNORECASE)
                        if match:
                            parts = [p.strip() for p in match.groups()]
                            for part in parts:
                                cleaned = part.replace(',', '.')
                                if re.match(r'^\d+\.?\d*$', cleaned):
                                    try:
                                        amount = float(cleaned)
                                        label = next(p for p in parts if p != part)
                                        if amount > 0 and len(label) > 0:
                                            parsed = {"label": label[:50], "amount": amount}
                                            break
                                    except (ValueError, StopIteration):
                                        continue
                            if parsed:
                                break

                    if parsed:
                        # Vérife si le doublon existe déjà (sans label pour éviter les faux positifs)
                        existing = db.query(Expense).filter(
                            Expense.date == msg_date,
                            Expense.amount == Decimal(str(parsed["amount"])),
                            Expense.source == "telegram",
                            Expense.account_id == account["id"],
                        ).first()

                        if existing:
                            duplicates_found += 1
                        else:
                            expenses_preview.append({
                                "date": str(msg_date),
                                "label": parsed["label"],
                                "amount": f"{parsed['amount']:.2f}",
                                "account": account["name"],
                                "account_id": account["id"],
                                "is_duplicate": False
                            })
            except Exception:
                pass

        await client.disconnect()

        return {
            "expenses": expenses_preview,
            "count": len(expenses_preview),
            "duplicates": duplicates_found,
            "message": f"{len(expenses_preview)} dépenses prêtes à être importées ({duplicates_found} doublons filtrés)"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur preview: {str(e)}")


def _map_category_to_model(yaml_category: str) -> str:
    """Mappe les catégories YAML aux catégories du modèle Expense."""
    mapping = {
        "alimentation": "50/50",
        "logement": "50/50",
        "enfants": "50/50",
        "transport": "50/50",
        "loisirs": "50/50",
        "sante": "50/50",
        "brico": "brico",
        "quotepart": "quotepart",
        "virement": "virement",
        "trop_plein": "trop_plein",
        "regule_periode": "regule_periode",
        "divers": "divers",
    }
    return mapping.get(yaml_category, "divers")


async def _fetch_telegram_messages(client, groups, start_date, end_date):
    """Récupère tous les messages Telegram HORS transaction DB."""
    import re
    from datetime import datetime as dt

    messages_to_import = []
    categorizer = Categorizer()

    for group_id, account in groups.items():
        try:
            async for message in client.iter_messages(group_id, limit=None):
                if not message.text:
                    continue

                # Filtre par date
                msg_date = message.date.date()
                if start_date and msg_date < dt.fromisoformat(start_date).date():
                    continue
                if end_date and msg_date > dt.fromisoformat(end_date).date():
                    continue

                # Parse la dépense
                patterns = [
                    r'^([a-zA-Z\s\-\.éèôûâêîéàù]+?)\s+([\d,\.]+)[\s€]*$',
                    r'^([\d,\.]+)[\s€]*(.+)$',
                    r'^([\d,\.]+)\s*-\s*([a-zA-Z\s\-\.éèôûâêîéàù]+)$',
                ]

                parsed = None
                for pattern in patterns:
                    match = re.search(pattern, message.text.strip(), re.IGNORECASE)
                    if match:
                        parts = [p.strip() for p in match.groups()]
                        for part in parts:
                            cleaned = part.replace(',', '.')
                            if re.match(r'^\d+\.?\d*$', cleaned):
                                try:
                                    amount = float(cleaned)
                                    label = next(p for p in parts if p != part)
                                    if amount > 0 and len(label) > 0:
                                        parsed = {"label": label[:50], "amount": amount}
                                        break
                                except (ValueError, StopIteration):
                                    continue
                        if parsed:
                            break

                if parsed:
                    # Catégorise le label
                    yaml_category = categorizer.categorize(parsed['label'])
                    category = _map_category_to_model(yaml_category)

                    messages_to_import.append({
                        'date': msg_date,
                        'label': parsed['label'],
                        'amount': parsed['amount'],
                        'account_id': account['id'],
                        'category': category
                    })
        except Exception:
            pass

    return messages_to_import


@router.post("/telegram/import")
async def telegram_import(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Lance l'import Telegram en utilisant la session existante.

    Paramètres:
    - start_date: Date de début (YYYY-MM-DD)
    - end_date: Date de fin (YYYY-MM-DD)
    - limit: Limiter le nombre de dépenses à importer (pour tester)
    """
    import asyncio
    from telethon import TelegramClient
    from datetime import datetime as dt

    # Config Telegram
    API_ID = 30366159
    API_HASH = "165a968c795273574e30d881355ba3f7"
    PHONE = "+33781103889"

    # Groupes Telegram
    groups = {
        -718152023: {"name": "loic", "id": 1},
        -4165469698: {"name": "alice", "id": 2},
        -5164479851: {"name": "alice (quotepart)", "id": 2},
        -5151201098: {"name": "alice (50/50)", "id": 2},
        -4118780090: {"name": "loic (dépenses)", "id": 1},
    }

    try:
        client = TelegramClient('alo_session', API_ID, API_HASH)
        await client.connect()

        if not await client.is_user_authorized():
            await client.disconnect()
            raise HTTPException(
                status_code=401,
                detail="Session Telegram expirée. Relancez le script en CLI: uv run python app/telegram_bot/import_history.py"
            )

        # ÉTAPE 1 : Récupère tous les messages AVANT transactions DB
        messages_to_import = await _fetch_telegram_messages(client, groups, start_date, end_date)
        await client.disconnect()

        # ÉTAPE 2 : Traite les messages avec transactions DB
        created_total = 0
        skipped_total = 0

        # Applique la limite si spécifiée (pour tester)
        messages_to_process = messages_to_import[:limit] if limit else messages_to_import

        for msg_data in messages_to_process:
            msg_date = msg_data['date']
            label = msg_data['label']
            amount = msg_data['amount']
            account_id = msg_data['account_id']
            category = msg_data['category']

            # Vérife si le doublon existe déjà (sans label pour éviter les faux positifs)
            existing = db.query(Expense).filter(
                Expense.date == msg_date,
                Expense.amount == Decimal(str(amount)),
                Expense.source == "telegram",
                Expense.account_id == account_id,
            ).first()

            if existing:
                skipped_total += 1
                continue

            # Crée la dépense
            try:
                new_expense = Expense(
                    date=msg_date,
                    label=label,
                    amount=Decimal(str(amount)),
                    category=category,
                    source="telegram",
                    account_id=account_id,
                    status="draft",
                )
                db.add(new_expense)
                db.flush()

                # Calcule le partage
                sharing_entries = calculator.calculate_sharing(new_expense, db)
                for entry in sharing_entries:
                    db.add(entry)

                created_total += 1

                # Commit par batch
                if created_total % 20 == 0:
                    db.commit()
            except Exception:
                skipped_total += 1

        # Commit final
        db.commit()

        return {
            "created": created_total,
            "skipped": skipped_total,
            "filtered": len(messages_to_process) - created_total - skipped_total,
            "total_available": len(messages_to_import),
            "imported": len(messages_to_process),
            "message": f"Import terminé: {created_total} créées (limite: {limit})" if limit else f"Import terminé: {created_total} créées"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur import Telegram: {str(e)}")


@router.get("/telegram/preview")
async def telegram_preview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    Prévisualisation des données Telegram avant import
    """
    # TODO: Intégrer avec le script d'import Telegram pour extraire les données
    return [
        {
            "date": "2026-06-05",
            "label": "Carrefour",
            "amount": "47.50",
            "category": "quotepart",
            "source": "telegram",
            "account_id": 1,
        }
    ]


@router.post("/csv/preview")
async def csv_preview(file: UploadFile = File(...)):
    """
    Prévisualisation des données CSV Fortuneo avant import
    """
    try:
        content = await file.read()

        # Détecte si c'est un ZIP ou CSV
        if file.filename.endswith('.zip'):
            csv_content = CsvImporter.extract_csv_from_zip(content)
        else:
            # Essaie UTF-8-sig puis ISO-8859-1
            try:
                csv_content = content.decode('utf-8-sig')
            except UnicodeDecodeError:
                try:
                    csv_content = content.decode('iso-8859-1')
                except UnicodeDecodeError:
                    raise ValueError("Encodage CSV non reconnu (UTF-8 ou ISO-8859-1 attendus)")

        # Parse le CSV
        importer = CsvImporter()
        expenses = importer.parse_csv(csv_content)

        # Formate pour le preview
        preview = []
        categorizer = Categorizer()

        for exp in expenses:
            # Catégorise
            yaml_category = categorizer.categorize(exp['label'])
            category = _map_category_to_model(yaml_category)

            # Skip les revenus (VIR, etc.)
            if exp['is_income']:
                category = 'virement'

            preview.append({
                'date': str(exp['date']),
                'label': exp['label'],
                'amount': f"{exp['amount']:.2f}",
                'category': category,
                'source': 'csv_import',
            })

        return {
            'expenses': preview,
            'count': len(preview),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lecture CSV: {str(e)}")


@router.post("/csv/import")
async def csv_import(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Lance l'import CSV Fortuneo en DB
    """
    try:
        content = await file.read()

        # Détecte si c'est un ZIP ou CSV
        if file.filename.endswith('.zip'):
            csv_content = CsvImporter.extract_csv_from_zip(content)
        else:
            # Essaie UTF-8-sig puis ISO-8859-1
            try:
                csv_content = content.decode('utf-8-sig')
            except UnicodeDecodeError:
                try:
                    csv_content = content.decode('iso-8859-1')
                except UnicodeDecodeError:
                    raise ValueError("Encodage CSV non reconnu (UTF-8 ou ISO-8859-1 attendus)")

        # Parse le CSV
        importer = CsvImporter()
        expenses = importer.parse_csv(csv_content)

        created_total = 0
        skipped_total = 0
        categorizer = Categorizer()

        for exp in expenses:
            # Catégorise
            yaml_category = categorizer.categorize(exp['label'])
            category = _map_category_to_model(yaml_category)

            # Les revenus (VIR) vont en "virement"
            if exp['is_income']:
                category = 'virement'

            # Vérife si le doublon existe (date, amount, source)
            existing = db.query(Expense).filter(
                Expense.date == exp['date'],
                Expense.amount == Decimal(str(exp['amount'])),
                Expense.source == "csv_import",
            ).first()

            if existing:
                skipped_total += 1
                continue

            # Crée la dépense
            try:
                # Détermine le bon account_id basé sur le libellé
                account_id = 5  # Default: Fortuneo joint
                label_upper = exp['label'].upper()

                # Détecte le compte personnel basé sur le nom dans le libellé
                if any(name in label_upper for name in ['ALICE', 'VASSEUR']):
                    account_id = 2  # Alice
                elif any(name in label_upper for name in ['LOIC', 'GOURMELON']):
                    account_id = 1  # Loïc

                new_expense = Expense(
                    date=exp['date'],
                    label=exp['label'],
                    amount=Decimal(str(exp['amount'])),
                    category=category,
                    source="csv_import",
                    account_id=account_id,
                    status="draft",
                )
                db.add(new_expense)
                db.flush()

                # Calcule le partage
                sharing_entries = calculator.calculate_sharing(new_expense, db)
                for entry in sharing_entries:
                    db.add(entry)

                created_total += 1

                # Commit par batch
                if created_total % 20 == 0:
                    db.commit()
            except Exception:
                skipped_total += 1

        # Commit final
        db.commit()

        return {
            "created": created_total,
            "skipped": skipped_total,
            "message": f"Import CSV terminé: {created_total} créées"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur import CSV: {str(e)}")


@router.post("/deduplicate")
async def deduplicate_expenses(data: dict):
    """
    Dédoublonne les dépenses en se basant sur (date, montant, label)
    """
    expenses = data.get("expenses", [])

    # Crée un dictionnaire pour tracker les doublons
    seen = {}
    deduped = []
    duplicate_count = 0

    for expense in expenses:
        key = (expense["date"], expense["amount"], expense["label"])
        if key not in seen:
            seen[key] = True
            deduped.append(expense)
        else:
            duplicate_count += 1

    return {
        "deduped": deduped,
        "duplicate_count": duplicate_count,
    }


@router.post("/confirm")
async def confirm_import(
    data: dict,
    db: Session = Depends(get_db),
):
    """
    Valide et crée les dépenses en base de données
    """
    source = data.get("source")
    expenses = data.get("expenses", [])

    created_count = 0

    try:
        for expense in expenses:
            # Crée une dépense
            amount = Decimal(str(expense["amount"]).replace(',', '.'))

            new_expense = Expense(
                date=expense["date"],
                label=expense["label"],
                amount=amount,
                category=expense.get("category", "divers"),
                source=source,
                account_id=expense.get("account_id", 1),
                status="draft",
            )
            db.add(new_expense)

            # Calcule le partage
            sharing_entries = calculator.calculate_sharing(new_expense, db)
            for entry in sharing_entries:
                db.add(entry)

            created_count += 1

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'import: {str(e)}")

    return {
        "created": created_count,
        "skipped": len(expenses) - created_count,
    }
