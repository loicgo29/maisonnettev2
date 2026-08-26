# language: fr
Fonctionnalité: Production est disponible et sans erreurs

  Contexte:
    Avant chaque scénario
    La page d'accueil est chargée

  Scénario: Page production charge sans 502
    Quand je charge la page de production
    Alors la réponse n'est pas 502 Bad Gateway
    Et la réponse n'est pas 503 Service Unavailable
    Et la réponse n'est pas 504 Gateway Timeout

  Scénario: Frontend est accessible depuis Caddy
    Quand Caddy requête le frontend
    Alors Caddy reçoit 200 OK
    Et Caddy n'a pas d'erreur de proxy

  Scénario: Page de production est complète
    Quand je charge la page de production
    Alors le titre principal est présent
    Et la galerie est chargée
    Et les 8 photos sont visibles
    Et le bouton CTA est cliquable
    Et aucune erreur JavaScript dans la console

  Scénario: Aucun service n'est restarting
    Quand je liste les containers Docker pour vérifier leur santé
    Alors aucun container n'est en erreur
    Et aucun container n'est crashé
    Et le frontend n'est pas en restart loop

  Scénario: Frontend healthcheck est OK
    Quand je vérifie la santé du frontend
    Alors le frontend n'est pas en "health: starting"
    Et le frontend n'est pas en "health: error"

  Scénario: Caddy configuration est valide
    Quand je vérifie la configuration Caddy
    Alors Caddy écoute sur le port 80
    Et Caddy ne retourne pas 403 Forbidden du frontend
