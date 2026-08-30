# language: fr
Fonctionnalité: Vérifier le contenu de la page de production

  Contexte:
    Avant chaque scénario
    La page d'accueil est chargée

  @production
  Scénario: Caddy peut accéder au frontend en interne
    Quand Caddy proxifie vers le frontend
    Alors la réponse est 200 OK

  Scénario: Page d'accueil affiche le titre principal
    Quand je vérifie le titre principal
    Alors le titre contient "Maisonnette de Bertheaume"
    Et le titre est visible

  Scénario: Page d'accueil affiche la description
    Quand je vérifie la description
    Alors la description contient "Côtes d'Armor"
    Et la description est visible

  Scénario: Galerie affiche 8 photos
    Quand je vérifie la galerie
    Alors la galerie contient 8 photos
    Et chaque photo a un numéro
    Et les numéros vont de 1 à 8

  Scénario: Section info affiche 4 cartes
    Quand je vérifie les cartes d'information
    Alors il y a 4 cartes
    Et une carte affiche "Localisation"
    Et une carte affiche "Chambres"
    Et une carte affiche "Capacité"
    Et une carte affiche "Surface"

  Scénario: Bouton d'appel à l'action est présent
    Quand je vérifie le bouton d'action
    Alors le bouton existe
    Et le bouton affiche "Consulter les disponibilités"
    Et le bouton est cliquable

  Scénario: Toutes les images sont chargées
    Quand je vérifie les images
    Alors il y a au moins 8 images
    Et aucune image n'a src vide
    Et toutes les images ont un alt text

  Scénario: Structure HTML valide
    Quand je vérifie la structure
    Alors la page a une section hero
    Et la page a une section galerie
    Et la page a une section info
    Et la page a une section CTA

  Scénario: Performance - Page charge rapidement
    Quand je mesure le temps de chargement
    Alors la page charge en moins de 3 secondes
    Et le contenu principal charge en moins de 2 secondes
