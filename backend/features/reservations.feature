# language: fr
Fonctionnalité: Gestion des réservations
  Contexte du métier: Les gîtes ont des tarifs à la nuit et doivent éviter les chevauchements de réservations

  Scénario: Créer une réservation simple
    Étant donné qu'un gîte existe avec un tarif de 100€/nuit
    Et que je suis authentifié en tant qu'utilisateur
    Quand je crée une réservation du 2026-09-01 au 2026-09-05 pour ce gîte
    Alors la réservation est créée avec un statut PENDING
    Et le montant total est de 400€

  Scénario: Rejeter une réservation qui chevauche une autre
    Étant donné qu'un gîte existe avec une réservation confirmée du 2026-10-01 au 2026-10-05
    Et que je suis authentifié en tant qu'utilisateur
    Quand je tente de créer une réservation du 2026-10-03 au 2026-10-07 pour ce gîte
    Alors la création échoue avec un message "Dates not available"

  Scénario: Autoriser une réservation après une annulée
    Étant donné qu'un gîte existe avec une réservation annulée du 2026-11-01 au 2026-11-05
    Et que je suis authentifié en tant qu'utilisateur
    Quand je crée une réservation du 2026-11-01 au 2026-11-05 pour ce gîte
    Alors la réservation est créée avec succès
    Et le statut est PENDING

  Scénario: Calculer correctement le prix pour 1 nuit
    Étant donné qu'un gîte existe avec un tarif de 150€/nuit
    Et que je suis authentifié en tant qu'utilisateur
    Quand je crée une réservation du 2026-12-01 au 2026-12-02 pour ce gîte
    Alors le montant total est de 150€

  Scénario: Confirmer une réservation après paiement Stripe
    Étant donné qu'une réservation existe avec le statut PENDING
    Et que j'ai reçu une confirmation de paiement Stripe
    Quand j'appelle le webhook Stripe avec le paiement valide
    Alors la réservation passe au statut CONFIRMED
    Et l'événement Google Calendar est créé

  Scénario: Lister les réservations de l'utilisateur
    Étant donné que je suis authentifié en tant qu'utilisateur
    Et que j'ai 3 réservations confirmées
    Quand je demande mes réservations
    Alors je reçois une liste de 3 réservations
    Et toutes les réservations ont mon email
