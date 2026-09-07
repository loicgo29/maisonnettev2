# Récupération des IDs des groupes Telegram

## 🎯 Objectif
Récupérer les IDs uniques de tes 2 groupes (Tigresse et Gourmich) pour configurer le bot.

## 📋 Étapes

### 1️⃣ Récupère ton token Telegram

Si tu ne l'as pas, crée un bot :
- Ouvre Telegram, cherche `@BotFather`
- Envoie `/newbot`
- Suis les instructions
- Récupère le token (format: `123456:ABC-DEF1234...`)

### 2️⃣ Lance le script diagnostic

```bash
cd /Volumes/logousb/SSD/Projects/alo/app
source venv/bin/activate

export TELEGRAM_BOT_TOKEN="ton_token_ici"
python app/telegram_bot/get_group_ids.py
```

Tu devrais voir :
```
🤖 Bot diagnostic lancé...
Token: 123456...
En attente de messages...
```

### 3️⃣ Ajoute le bot aux groupes

**Pour le groupe Tigresse :**
1. Ouvre Telegram → groupe Tigresse
2. Appuie sur le nom du groupe en haut
3. Appuie sur "Ajouter un membre"
4. Cherche ton bot par username et ajoute-le

**Pour le groupe Gourmich :**
1. Répète pour le groupe Gourmich

### 4️⃣ Récupère les IDs

1. Envoie n'importe quel message dans le groupe Tigresse
2. **Regarde le terminal** - tu verras :
```
============================================================
📱 Nouveau message reçu:
  ID du groupe: -1001234567890
  Nom du groupe: Tigresse
  Type: supergroup
  ...
============================================================
```

3. **Copie l'ID** : `-1001234567890`
4. Répète pour Gourmich

### 5️⃣ Configure le bot principal

Une fois que tu as les 2 IDs, crée un fichier `.env` :

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_GROUP_TIGRESSE=-1001234567890
TELEGRAM_GROUP_GOURMICH=-1001234567891
```

## 🔍 Exemple de résultat

```
Groupe Tigresse:  -1001234567890
Groupe Gourmich: -1001234567891
Token: 123456:ABC-DEF1...
```

Ensuite, je crée le bot qui traite les dépenses ! 🚀

## ⚠️ Important

- Le token est secret ! Ne le partage pas
- Les IDs de groupes commencent par `-100`
- Les IDs d'utilisateurs sont positifs

---

**Une fois prêt, envoie-moi les IDs et je lance le bot principal !** 💪
