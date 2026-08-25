# language: fr
Fonctionnalité: Vérification de santé des services (Health Check)

  Scénario: Frontend est accessible et charge
    Quand je navigue vers http://localhost:5173
    Alors la page charge avec un code HTTP 200
    Et le titre de la page contient "Maisonnette" ou "frontend"
    Et aucune erreur JavaScript n'est affichée

  Scénario: Backend API répond avec santé OK
    Quand j'appelle GET http://localhost:3001/health
    Alors la réponse est 200
    Et le JSON contient "status" = "healthy"
    Et le champ "database" contient "connected"

  Scénario: Base de données est accessible
    Quand je test la connexion PostgreSQL sur localhost:5433
    Alors la connexion est établie
    Et au minimum une table existe

  Scénario: Swagger API documentation est disponible
    Quand je navigue vers http://localhost:3001/api/docs
    Alors la page charge
    Et je vois "Swagger UI"
    Et les endpoints sont listés

  Scénario: Toutes les variables d'environnement sont définies
    Quand je vérifie le fichier .env
    Alors les clés requises existent:
      | VITE_API_URL |
      | NODE_ENV |
      | DATABASE_URL |
      | STRIPE_SECRET_KEY |
      | STRIPE_PUBLISHABLE_KEY |

  Scénario: Services Docker sont running
    Quand je liste les containers Docker
    Alors le container maisonnettev2-frontend est running
    Et le container maisonnettev2-backend est running
    Et le container postgres-maisonnettev2 est running
    Et aucun container n'est dans l'état "restarting"
