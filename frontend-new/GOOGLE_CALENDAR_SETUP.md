# Configuration Google Calendar OAuth2 - Maisonnette V2

## 🗓️ Intégration Sécurisée du Calendrier Google

Ce guide explique comment configurer l'intégration Google Calendar **avec OAuth2** - seul votre site aura accès après votre autorisation personnelle.

## 🔒 Sécurité

✅ **Sécurisé** : Authentification OAuth2 (seul le site autorisé peut accéder)
✅ **Privé** : Les événements privés restent privés
✅ **Autorisé** : Vous donnez votre permission une seule fois

## 📋 Prérequis

- Un compte Google
- Le calendrier : `lgbertheaume@gmail.com`

## 🔑 Étapes de configuration

### 1. Créer un projet Google Cloud

1. Allez à [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet : **"Maisonnette Calendar"**
3. Attendez que le projet soit créé

### 2. Activer l'API Google Calendar

1. Dans Google Cloud Console, allez à **APIs & Services** → **Library**
2. Cherchez **"Google Calendar API"**
3. Cliquez **Enable**

### 3. Créer les credentials OAuth2

1. Allez à **APIs & Services** → **Credentials**
2. Cliquez **Create Credentials** → **OAuth client ID**
3. Si demandé, configurez le consentement OAuth :
   - Type utilisateur : **"External"**
   - Scopes : **"calendar.readonly"**
4. Pour le type d'application, choisissez **"Web application"**
5. Nommez-le : **"Maisonnette Calendar"**
6. Authorized JavaScript origins : `http://localhost:8030`
7. Authorized redirect URIs : `http://localhost:8030/api/calendar/callback`
8. Cliquez **Create**

### 4. Copier les credentials

Une fois créés, vous verrez :
- **Client ID** : copier
- **Client Secret** : copier

### 5. Configurer les variables d'environnement

Créez/modifiez `.env.local` du frontend :

```bash
GOOGLE_CLIENT_ID=votre_client_id_ici
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
GOOGLE_REDIRECT_URI=http://localhost:8030/api/calendar/callback
```

### 6. Redémarrer le serveur

```bash
npm run dev
```

### 7. S'authentifier

1. Allez à : `http://localhost:8030/calendar`
2. Cliquez **"Connecter avec Google"**
3. Autorisez l'accès au calendrier
4. **C'est tout !** Les événements s'affichent

## 📅 Utilisation

### Créer un événement

1. Allez à [Google Calendar](https://calendar.google.com)
2. Créez un nouvel événement
3. Assurez-vous qu'il est sur `lgbertheaume@gmail.com`
4. L'événement s'affiche sur le site en 1-2 minutes

### Événements affichés

Le calendrier affiche :
- ✅ Titre de l'événement
- ✅ Date et heure
- ✅ Description
- ✅ **Événements publics ET privés** (grâce à OAuth2)

## 🔄 Production

Pour utiliser en production (`https://maisonnette-pecheur-bertheaume.fr`) :

1. Dans Google Cloud Console, modifiez les URIs :
   - **Authorized JavaScript origins** : `https://maisonnette-pecheur-bertheaume.fr`
   - **Authorized redirect URIs** : `https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback`

2. Mettez à jour `.env` :
   ```bash
   GOOGLE_REDIRECT_URI=https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback
   ```

## 🐛 Dépannage

### Erreur "Client ID not configured"

Assurez-vous que `.env.local` contient `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.

### Erreur "invalid_grant"

Le code OAuth2 a expiré. Allez à `/calendar` et refaites l'authentification.

### Les événements privés n'apparaissent pas

Vérifiez que vous avez autorisé l'accès à **"See all event details"** lors de l'authentification.

## 📚 Ressources

- [Google OAuth2 Flow](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [SvelteKit](https://kit.svelte.dev/)
