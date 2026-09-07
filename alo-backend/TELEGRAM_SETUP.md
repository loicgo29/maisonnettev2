# Configuration du Bot Telegram – ALO

Ce document explique comment créer et connecter le bot Telegram à ALO.

## 1. Créer un bot avec BotFather

1. Ouvre Telegram et cherche **@BotFather**
2. Envoie `/start` et suis les instructions
3. Envoie `/newbot` pour créer un nouveau bot
4. Donne-lui un nom (ex: "ALO Expenses")
5. Donne-lui un username unique (ex: "alo_expenses_bot")
6. BotFather te donnera un **token** (`123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh`)
   - Garde-le secret ! C'est la clé d'accès au bot.

## 2. Récupérer ton Chat ID

### Option A : Dans un groupe Telegram
1. Ajoute ton bot à un groupe (ex: "Dépenses familiales")
2. Envoie un message au groupe : `/start`
3. Ouvre cette URL dans un navigateur en remplaçant TOKEN :
   ```
   https://api.telegram.org/botTOKEN/getUpdates
   ```
4. Tu verras du JSON. Cherche `"chat":{"id":123456789}`
5. Ton **Chat ID** est ce nombre.

### Option B : Avec un bot webhook
Tu peux utiliser des services comme [userinfobot](https://t.me/userinfobot) pour avoir directement ton ID utilisateur.

## 3. Configurer le fichier `.env`

1. Copie `.env.example` en `.env`
2. Remplis les valeurs :
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
   TELEGRAM_CHAT_ID=987654321
   ```

## 4. Démarrer le bot

```bash
# En deux terminaux séparés :

# Terminal 1 : FastAPI API
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2 : Bot Telegram (process séparé)
uv run python -m telegram_bot.bot
```

## 5. Tester le bot

Dans le chat Telegram :
1. `/start` → Le bot répond avec les instructions
2. `Lidl 47.30` → Le bot crée une dépense, l'API la sauvegarde
3. `/last` → Affiche les 5 dernières dépenses
4. `/total` → Affiche le total du mois

## Formats acceptés

Le bot comprend ces formats de texte libre :

```
Lidl 47.30
47,50 Carrefour
Transport - 12€
Essence 45 € remplissage
```

Le parser extrait :
- **Label** : le nom/description (ex: "Lidl")
- **Montant** : le prix avec . ou , (ex: "47.30" ou "47,50")

## Dépannage

### Le bot ne répond pas
- Vérifie que le token est correct dans `.env`
- Vérifie que le bot process tourne : `uv run python -m telegram_bot.bot`
- Regarde les logs du bot pour les erreurs

### L'API n'est pas accessible depuis le bot
- Vérifie que l'API FastAPI tourne sur `http://localhost:8000`
- Vérifie que le firewall/réseau permet la connexion en local

### Je ne vois pas mes dépenses
- Envoie `/start` au bot pour tester la connexion
- Regarde dans la Swagger de l'API : `http://localhost:8000/docs`
- GET `/api/expenses` doit afficher tes dépenses

## Notes importantes

- **Token secret** : Ne partage jamais ton token ! Restringe l'accès au bot via les permissions Telegram.
- **Chat ID privé** : Le Chat ID identifie le groupe/conversation, ce n'est pas aussi sensible que le token.
- **Process séparé** : Le bot et l'API tournent dans deux process Python distincts (pas de conflit asyncio).
- **Polling** : Le bot utilise le polling (longue interrogation), pas les webhooks. C'est plus simple à mettre en place localement.
