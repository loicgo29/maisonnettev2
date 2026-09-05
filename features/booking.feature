# language: fr
Fonctionnalité: Réservation de gîtes

  Contexte:
    L'utilisateur est authentifié
    Le frontend est accessible sur http://localhost:5173
    Le backend est accessible sur http://localhost:3001
    Une propriété est disponible avec l'ID "prop-001"

  Scénario: Utilisateur recherche un gîte par dates
    Quand je navigue vers http://localhost:5173
    Et j'entre la date d'arrivée "2026-09-01"
    Et j'entre la date de départ "2026-09-08"
    Et j'appuie sur "Rechercher"
    Alors la liste des gîtes disponibles s'affiche
    Et le nombre de résultats est supérieur à 0

  Scénario: Utilisateur consulte les détails d'un gîte
    Quand je clique sur une propriété "Gîte de la Montagne"
    Alors je vois les détails de la propriété
    Et je vois la galerie de photos
    Et je vois le prix par nuit
    Et je vois les équipements
    Et je vois les avis des clients
    Et je vois la localisation sur la carte

  Scénario: Utilisateur vérifie la disponibilité
    Quand je suis sur la page d'une propriété
    Et j'entre les dates "2026-09-01" à "2026-09-08"
    Alors le calendrier affiche la disponibilité
    Et un badge "Disponible" apparaît si les dates sont libres
    Et le prix total s'affiche (7 nuits × 100€)

  Scénario: Utilisateur crée une réservation
    Quand je clique sur "Réserver maintenant"
    Et je confirms les dates "2026-09-01" à "2026-09-08"
    Et je valide les conditions d'annulation
    Alors une réservation temporaire est créée
    Et je suis redirigé vers le paiement
    Et le montant affiche "700€" TTC

  Scénario: Réservation est créée en base de données
    Quand j'appelle POST http://localhost:3001/api/reservations avec:
      | check_in  | 2026-09-01 |
      | check_out | 2026-09-08 |
      | property_id | prop-001 |
    Alors la réponse est 201
    Et l'ID de réservation est généré
    Et le statut est "pending_payment"

  Scénario: Utilisateur ne peut pas réserver une date déjà occupée
    Quand je tente de réserver les dates "2026-08-15" à "2026-08-22"
    Et ces dates sont déjà réservées
    Alors j'obtiens une erreur 409
    Et le message affiche "Ces dates ne sont pas disponibles"

  Scénario: Utilisateur reçoit un email de confirmation après réservation
    Quand une réservation est créée avec succès
    Alors un email est envoyé à l'adresse de l'utilisateur
    Et l'email contient le numéro de réservation
    Et l'email contient les détails du gîte
    Et l'email contient les conditions d'annulation

  Scénario: Utilisateur peut annuler sa réservation
    Quand je suis sur mon historique de réservations
    Et je clique sur "Annuler" pour une réservation
    Avec un statut "pending_payment"
    Alors la réservation est supprimée
    Et j'obtiens une confirmation
    Et aucun remboursement n'est appliqué

  Scénario: Réservation confirmée ne peut pas être annulée gratuitement
    Quand une réservation a le statut "confirmed"
    Et j'essaie de l'annuler
    Alors un message affiche la politique d'annulation
    Et un remboursement partiel est calculé selon les conditions

  Scénario: Utilisateur peut modifier les dates d'une réservation
    Quand je suis sur une réservation "pending_payment"
    Et je clique sur "Modifier les dates"
    Et je sélectionne de nouvelles dates "2026-09-05" à "2026-09-12"
    Alors le prix total est recalculé
    Et la différence est ajoutée/remboursée du paiement
