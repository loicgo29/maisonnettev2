# language: fr
Fonctionnalité: Gestion des réservations

  Contexte:
    Avant chaque scénario
    L'API est accessible

  Scénario: Créer une réservation sans authentification
    Quand je crée une réservation
    Alors la réservation est créée avec succès
    Et le statut est "PENDING"

  Scénario: Validation des dates de réservation
    Quand je crée une réservation avec des dates invalides
    Alors j'obtiens une erreur de validation
    Et le code d'erreur est 400

  Scénario: Vérifier les conflits de réservation
    Quand j'essaie de réserver des dates déjà occupées
    Alors j'obtiens une erreur de conflit
    Et le message contient "Dates not available"

  # Doit rester le dernier scénario : il épuise volontairement le quota du
  # limiteur (10 requêtes / heure, compteur en mémoire partagé), ce qui ferait
  # échouer en 429 tout scénario de réservation exécuté après lui.
  Scénario: Rate limiting sur création de réservation
    Quand je fais 11 demandes de réservation
    Alors la 11ème requête est rejetée
    Et le code d'erreur est 429
