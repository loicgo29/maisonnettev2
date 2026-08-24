# language: fr
Fonctionnalité: Caddy Reverse Proxy

  Contexte:
    Caddy est disponible sur http://localhost:80
    Le backend est accessible sur http://localhost:3001
    Le frontend est accessible sur http://localhost:3000

  Scénario: Caddy route /api vers le backend
    Quand j'appelle GET http://localhost/api/reservations via Caddy
    Alors la réponse est 200

  Scénario: Caddy route /api/* vers le backend correctement
    Quand j'appelle GET http://localhost/api/health via Caddy
    Alors la réponse doit être inférieure à 500

  Scénario: Caddy route /uploads/* vers le backend
    Quand j'appelle GET http://localhost/uploads/test-image.jpg via Caddy
    Alors la réponse est 404 ou supérieure

  Scénario: Caddy route les requêtes sans /api vers le frontend
    Quand j'appelle GET http://localhost/ via Caddy
    Alors la réponse est 200 ou 304

  Scénario: Caddy accepte les connexions sur le port 80
    Quand je test la connectivité http://localhost:80
    Alors la connexion est établie

  Scénario: Caddy ajoute les en-têtes de sécurité
    Quand j'appelle GET http://localhost/ via Caddy
    Alors le header X-Content-Type-Options contient "nosniff"
    Et le header X-Frame-Options contient "SAMEORIGIN"
    Et le header Referrer-Policy contient "strict-origin-when-cross-origin"

  Scénario: Caddy supprime le header Server
    Quand j'appelle GET http://localhost/ via Caddy
    Alors le header Server n'existe pas

  Scénario: Caddy compresse les réponses en gzip
    Quand j'appelle GET http://localhost/ via Caddy
    Alors le header Content-Encoding contient "gzip" ou "deflate"

  Scénario: Caddy enregistre les accès
    Quand j'appelle GET http://localhost/api/health via Caddy
    Alors les logs d'accès sont enregistrés

  Scénario: Caddy route correctement les sous-domaines
    Quand j'appelle GET http://localhost via Caddy
    Alors le reverse_proxy cible le frontend:3000

  Scénario: Caddy forward correctement les en-têtes de requête
    Quand j'appelle GET http://localhost/api/reservations via Caddy avec un header Authorization
    Alors le header est transmis au backend

  Scénario: Caddy gère les requêtes OPTIONS (CORS)
    Quand j'appelle OPTIONS http://localhost/api/reservations via Caddy
    Alors la réponse est 200 ou 204 ou 405

  Scénario: Caddy rejette les connexions HTTPS non configurées
    Quand je test la connectivité https://localhost:443
    Alors la connexion échoue ou n'est pas configurée
