# language: fr
Fonctionnalité: Authentification OAuth2 maisonnettev2

  Contexte:
    Authentik est disponible sur http://localhost:9000
    Le frontend est accessible sur http://localhost:5173
    Le backend est accessible sur http://localhost:3001

  Scénario: Utilisateur navigue vers la page d'accueil
    Quand je navigue vers http://localhost:5173
    Alors la page se charge sans erreur
    Et je vois "Maisonnette v2" ou "Gîte"

  Scénario: Utilisateur clique sur login
    Quand je navigue vers http://localhost:5173
    Et je clique sur "Connexion" ou "Login"
    Alors je suis redirigé vers Authentik

  Scénario: Authentik affiche les sources d'authentification
    Quand je vais à la page de login Authentik
    Alors je vois au minimum l'option email/password
    Et les sources Google/GitHub sont visibles si configurées

  Scénario: Utilisateur s'authentifie avec email/password
    Quand je navigue vers http://localhost:5173
    Et je clique sur "Connexion"
    Et je m'authentifie avec email "test@example.com" et password "test123"
    Alors je suis redirigé vers le dashboard
    Et mon token JWT est stocké localement

  Scénario: Backend valide le token JWT
    Quand j'appelle GET http://localhost:3001/api/reservations avec un JWT valide
    Alors la réponse est 200
    Et le statut n'est pas 401

  Scénario: Backend rejette une requête sans token
    Quand j'appelle GET http://localhost:3001/api/reservations sans authentification
    Alors la réponse est 401
    Et le message contient "Unauthorized"

  Scénario: Backend rejette un token expiré
    Quand j'appelle GET http://localhost:3001/api/reservations avec un JWT expiré
    Alors la réponse est 401

  Scénario: Healthcheck API fonctionne
    Quand j'appelle GET http://localhost:3001/health
    Alors la réponse est 200 ou 503
    Et le champ "status" existe

  Scénario: Swagger documentation est accessible
    Quand je navigue vers http://localhost:3001/api/docs
    Alors la page charge
    Et je vois la documentation Swagger
