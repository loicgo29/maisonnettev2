# Catégories et Mots-clés ALO

Documentation des catégories de dépenses et des mots-clés utilisés pour la classification automatique.

## Convention de nommage

- **Noms des personnes :** `loic`, `alice` (minuscules, sans accent)
- **Account ID :** 1 = loic, 2 = alice, 5 = fortuneo
- Cette convention est utilisée dans tous les mots-clés et la classification

## Vue d'ensemble

ALO utilise **5 catégories** qui représentent le **mode de partage** entre alice et loic, pas le type de dépense.

| # | Catégorie | Description | Partage | Mots-clés |
|---|-----------|-------------|---------|-----------|
| 1 | **quotepart** | Dépenses quotidiennes (courses, alimentation) | 50/50 | [Voir liste](#quotepart-keywords) |
| 2 | **50/50** | Partage égal (défaut) | 50/50 | Tout ce qui n'est pas classé |
| 3 | **brico** | Bricolage, travaux, réparations | 50/50 | [Voir liste](#brico-keywords) |
| 4 | **dette** | Prêts, remboursements directs | Remboursement | [Voir liste](#dette-keywords) |
| 5 | **virement** | Virements entre comptes (Alice/Loïc) | Direct | [Voir liste](#virement-keywords) |

---

## Quotepart (Quote-part / Alimentation)

**Utilisation :** Dépenses du quotidien : courses, alimentation, restauration, essence.

**Partage :** 50/50 entre alice et loic.

### Mots-clés {#quotepart-keywords}

#### Supermarchés et épiceries
- biocoop
- carrefour
- carrefour market
- leclerc
- auchan
- intermarché
- sefa
- kerbio
- boucherie
- boulangerie
- fromagerie

#### Magasins bio et vente directe
- crowdfarming
- la fourche
- fourche

#### Catégories alimentaires
- courses
- marché
- marche
- alimentation
- épicerie
- fruits
- légumes
- viande
- poisson
- fromage
- pain
- baguette
- lait
- oeufs
- beurre
- crème
- huile
- café
- thé
- chocolat
- sucre
- farine
- riz
- pâtes
- conserves

#### Restauration
- cantine
- restaurant

#### Transport et essence
- essence
- carburant
- gazole
- diesel

#### Autres
- pharmacie
- supermarchés
- magasin
- action
- grande surface
- câble
- ampoule
- électrique
- électronique
- seche cheveux
- appareil

---

## Brico (Bricolage / Travaux)

**Utilisation :** Bricolage, réparations, travaux immobiliers, matériaux de construction.

**Partage :** 50/50 (par défaut, mais peut être négociable selon le bénéfice).

### Mots-clés {#brico-keywords}

#### Grandes surfaces de bricolage
- leroy
- merlin
- castorama
- brico
- bricodépôt
- casto
- mr bricolage
- cedeo

#### Matériaux de construction
- placo
- carrelage
- peinture
- vernis
- enduit
- vis
- clou
- béton
- sable
- ciment
- pierre
- brique
- tuile

#### Plomberie et tuyauterie
- plomberie
- tuyau
- tuyauterie
- robinet
- mitigeur
- serrure
- poignée

#### Électricité et chauffage
- électricité
- chauffage
- fenêtre

#### Structures et terrasse
- terrasse
- dalle
- escalier
- rampe
- barrière
- grillage

#### Outils
- outil
- perceuse
- scie
- marteau
- tournevis
- clé
- lime
- burin
- chisel
- meuleuse
- sauteuse
- rabot
- établi

#### E-commerce
- amazon

---

## Dette (Prêt / Remboursement)

**Utilisation :** Prêts entre Alice et Loïc, remboursements directs de dettes.

**Partage :** Remboursement direct (pas de split 50/50).

### Mots-clés {#dette-keywords}

- doit
- dette
- prêt
- remboursement
- remboursé
- rembourser
- emprunté
- emprunter
- avance
- avancé
- retour
- rendre
- rendez
- tu dois
- je dois
- il doit
- elle doit

---

## Virement (Transfert)

**Utilisation :** Virements entre comptes bancaires de alice et loic.

**Partage :** Direct (pas de split) — identifie le compte destinataire automatiquement.

**Auto-détection du compte destinataire :**
- Contient "alice" ou "vasseur" → Account alice (id: 2)
- Contient "loic" ou "gourmelon" → Account loic (id: 1)
- Autres → Fortuneo par défaut (id: 5)

### Mots-clés {#virement-keywords}

#### Indicateurs de virement
- vir
- virement
- transfert
- envoyé
- reçu
- payé

#### Noms des personnes (minuscules)
- loic
- alice
- lannion
- brest
- vasseur
- gourmelon

---

## 50/50 (Égal par défaut)

**Utilisation :** Toute dépense qui ne correspond à aucune catégorie ci-dessus.

**Partage :** 50/50 entre alice et loic.

**Mots-clés :** Aucun (catégorie par défaut).

---

## Mots-clés auxiliaires (non utilisés pour la classification ALO)

### Banques (pour identification de source)

#### CMB keywords
- cb
- carte bleu
- carte bancaire

#### Fortuneo keywords
- vir
- prlv
- prelevement
- transfert
- ech pret

### Catégories supplémentaires (réservées, non utilisées)

Cas préservés pour utilisation future :

#### Logement
- edf
- gdf
- gaz
- eau
- orange
- fibre
- internet
- electricite
- chauffage
- assurance
- maif
- loyer

#### Transport
- essence
- carburant
- gazole
- diesel
- sncf
- ratp
- transport
- uber
- taxi
- parking

#### Santé
- pharmacie
- sante
- docteur
- medecin
- hopital
- dentiste
- opticien

#### Loisirs
- restaurant
- cinema
- theatre
- loisirs
- hotel
- vacances
- spotify
- netflix

---

## Ordre de classification

La classification suit cet ordre de priorité :

1. **VIREMENT** — Check `VIREMENT_KEYWORDS` d'abord
2. **DETTE** — Check `DETTE_KEYWORDS`
3. **BRICO** — Check `BRICO_KEYWORDS`
4. **QUOTEPART** — Check `QUOTEPART_KEYWORDS`
5. **50/50** — Default fallback

---

## Sources

Ces définitions sont utilisées dans :
- `app/services/telegram_classifier.py` — Classification automatique pour Telegram
- `app/data/imports/import_fortuneo.py` — Classification pour imports Fortuneo
- Frontend UI (`app/static/index.html`) — Filtres et classification manuelle

## Mise à jour

Pour ajouter un nouveau mot-clé :
1. Identifier la catégorie appropriée
2. Ajouter le mot-clé à la liste dans ce fichier
3. Mettre à jour `app/services/telegram_classifier.py` pour que le code reflète le document
4. Commiter les deux changements ensemble

---

**Dernière mise à jour :** 2026-05-24
