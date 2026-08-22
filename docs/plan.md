# Plan — IDP (Authentik) + intégration maisonnettev2

## Contexte

Deux dépôts vides à construire :
- **idp** (`https://github.com/loicgo29/idp.git`) : IDP centralisé pour TOUS les projets persos de l'utilisateur (pas seulement maisonnettev2), auto-hébergé.
- **maisonnettev2** : site de location de gîte (1 gîte actuellement, 2 à terme). Squelette existant : formulaire de contact fonctionnel (React Hook Form + Zod → Express → Resend email + Twilio WhatsApp). Le README annonce des fonctionnalités (gîtes, calendrier, Stripe, OAuth) qui ne sont **pas encore implémentées** — seuls prisma, swagger-jsdoc/swagger-ui-express sont en dépendance sans être câblés.

Décisions validées avec l'utilisateur (via questions itératives) :
- IDP self-hosted, pas Auth0/Firebase managé. Après comparaison Keycloak/Authentik/Zitadel/Pocket ID/Authelia, choix retenu : **Authentik** (plus léger que Keycloak, UI/flows visuels, protocoles OIDC/SAML complets).
- Docker Compose en local pour dev, migration VPS pour la prod plus tard (pas à construire maintenant, juste rester compatible).
- **Isolation par projet** — chaque projet (`maisonnettev2`, `nas-logo`, futurs) a sa propre Application + Provider OIDC dans Authentik.
- Sources d'auth : Google OAuth + GitHub OAuth + email/password natif.
- `maisonnettev2/backend` reste une API **séparée** de NAS-LOGO-API, connectée au même Authentik via sa propre Application/Provider.
- Ne jamais committer de secrets ; README doit refléter l'état réel du code, pas des aspirations.
- Ajout demandé : **durcissement sécurité + audit sécurité**, **healthchecks** sur tous les services Docker + endpoints API, **base de données dédiée par API**.
- Ajout demandé : **3 environnements** (dev local / recette-staging / prod) + **CI/CD** (GitHub Actions) — audit sécurité + tests + migrations DB + déploiement en un clic. Déploiement recette/prod via **SSH + Docker Compose**.
- Bonnes pratiques 2026 : **error tracking + logs structurés** (Sentry, logs JSON sans secrets) et **backups DB avec objectifs RTO/RPO définis + tests de restauration réguliers**.

*(Voir `idp/Docs/planv1.md` pour le détail complet de Phase A — Authentik.)*

## Phase B — `maisonnettev2` (dépend de Phase A terminée pour B.3+)

Ordre : B.1 Prisma schema (Gite/Photo/Reservation, scalable 1→2+ gîtes) + Postgres dédié → B.2 Swagger réel monté sur `/api/docs` → B.3 OIDC (frontend `oidc-client-ts` PKCE redirect contre Authentik + backend middleware JWKS, retrait de `bcryptjs`/`jsonwebtoken` custom) → B.4 Pages Gîte/Galerie → B.5 Google Calendar sync (service account, lecture dispo + écriture à la confirmation) → B.6 Stripe (PaymentIntent + webhook avec body raw) → B.7 Healthchecks + durcissement + audit sécurité → B.8 README corrigé à chaque étape.

`oidc-client-ts` reste le bon choix côté frontend (portable OIDC standard — seule l'`authority` URL change : `http://localhost:9000/application/o/maisonnettev2/`). Backend : middleware JWKS (`jose` ou `jwks-rsa`) pointant sur `http://localhost:9000/application/o/maisonnettev2/jwks/`.

### B.1 Prisma — schéma minimal scalable

`backend/prisma/schema.prisma` :
- `Gite` : `id`, `slug`, `nom`, `description`, `adresse`, `capacite`, `prixNuit`, `googleCalendarId`, `createdAt`/`updatedAt`. Une seule ligne insérée via seed pour l'instant, mais toutes les requêtes filtrent déjà par `giteId`.
- `Photo` : `id`, `giteId` (FK), `url`, `categorie` (enum `EXTERIEUR | SALON | CUISINE | CHAMBRE | SDB | OUTDOOR`), `ordre`, `alt`.
- `Reservation` : `id`, `giteId` (FK), `dateDebut`, `dateFin`, `statut` (enum `PENDING | CONFIRMED | CANCELLED`), `stripePaymentIntentId` (nullable), `googleCalendarEventId` (nullable), `clientNom`, `clientEmail`, `clientTelephone`, `montantTotal`, `createdAt`.
- Pas de table `User` custom — l'identité vient de Keycloak/Authentik (sub du JWT).
- `backend/prisma/seed.ts` : insère le gîte unique + photos de démo.
- `backend/src/lib/prisma.ts` : instance Prisma Client singleton.

### Base de données dédiée

- Conteneur `postgres-maisonnettev2` distinct de celui d'`idp` — chaque API a sa propre base.
- `DATABASE_URL` dans `.env` pointe vers ce Postgres dédié. Volume nommé séparé (`maisonnettev2_pg_data`).

### B.2 Swagger réel

- `backend/src/config/swagger.ts` : config `swagger-jsdoc` (déjà en dépendance), scanne les annotations JSDoc dans `src/routes/*.ts`.
- Modifier `backend/src/index.ts` : monter `swagger-ui-express` sur `/api/docs`.
- Annotations JSDoc `@swagger` progressivement sur chaque route (`contact.ts`, futures `gites.ts`, `reservations.ts`).
- Corriger le README une fois fait.

### B.3 Intégration OIDC (dépend de Phase A terminée)

**Frontend** :
- `oidc-client-ts`, flow Authorization Code + PKCE avec redirect (pas de popup).
- `frontend/src/services/auth.ts` : `UserManager` configuré (`authority`, `client_id=maisonnettev2-frontend`, `redirect_uri`, `scope=openid profile email`).
- `frontend/src/contexts/AuthContext.tsx` : `user`, `isAuthenticated`, `login()`, `logout()`.
- `frontend/src/pages/AuthCallback.tsx` : route `/auth/callback`.
- `frontend/src/components/ProtectedRoute.tsx` : wrapper pour routes protégées.
- Modifier `App.tsx` (AuthProvider + route callback) et `services/api.ts` (intercepteur Bearer token).

**Backend** :
- `backend/src/middleware/auth.ts` : vérifie le JWT via JWKS (`jose` ou `jsonwebtoken`+`jwks-rsa`), `iss`/`aud` vérifiés, cache des clés JWKS.
- Appliqué uniquement aux routes nécessitant une identité (futur espace admin), pas à `/api/contact` ni aux routes de lecture publique.
- Retirer `bcryptjs` et `jsonwebtoken` custom du `package.json` une fois le middleware JWKS en place.

### B.4 Pages Gîte / Galerie

- Backend : `backend/src/routes/gites.ts` (GET `/api/gites`, GET `/api/gites/:slug`), `backend/src/services/gites.service.ts`.
- Frontend : `frontend/src/pages/Home.tsx`, `frontend/src/pages/GiteDetail.tsx`, `frontend/src/components/Gallery.tsx` (carousel/lightbox, ordre logique extérieur→salon→cuisine→chambres→sdb→outdoor), `frontend/src/types/gite.ts`, `frontend/src/services/gites.ts`.
- Modifier `App.tsx` : routes `/` → Home, `/gite/:slug` → GiteDetail.

### B.5 Google Calendar sync

- Lecture seule des events du calendrier Google existant via **Service Account** (pas d'OAuth utilisateur interactif).
- `backend/src/services/googleCalendar.service.ts` : `googleapis`, clé JSON service account hors repo.
- `backend/src/routes/availability.ts` : GET `/api/gites/:slug/availability?from=&to=` — combine events Google Calendar + réservations CONFIRMED en base.
- Frontend : `frontend/src/components/AvailabilityCalendar.tsx` — `react-day-picker` (léger, multi-mois, code couleur dispo/booked).
- À la confirmation d'une réservation : créer un event dans Google Calendar (écriture, permission d'édition du service account requise).

### B.6 Stripe

- `backend/src/routes/payments.ts` : POST `/api/reservations/:id/create-payment-intent`, webhook `/api/webhooks/stripe` (signature vérifiée via `STRIPE_WEBHOOK_SECRET`) → met à jour `Reservation.statut=CONFIRMED`, crée l'event Google Calendar, envoie l'email de confirmation.
- Important : route webhook montée avec `express.raw({type:'application/json'})` **avant** `express.json()` global — ordre des middlewares critique dans `index.ts`.
- `backend/src/services/stripe.service.ts` : wrapper client Stripe.
- Frontend : `frontend/src/pages/Booking.tsx` + `frontend/src/components/StripeCheckoutForm.tsx` (`@stripe/stripe-js` + `@stripe/react-stripe-js`).
- `.env.example` : `STRIPE_SECRET_KEY` (déjà présent), ajouter `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY`.

### B.7 Healthchecks

- `backend/src/routes/health.ts` : étendre `/health` (actuellement statique) pour vérifier réellement la connectivité DB (`prisma.$queryRaw`) et retourner 200/503.
- `docker-compose` : `healthcheck` sur `postgres-maisonnettev2` (`pg_isready`) et sur le backend (`curl -f http://localhost:3001/health`).
- Documenter `/health` dans le README pour un futur monitoring externe.

### B.7 Durcissement sécurité

- `helmet` déjà en place — vérifier/ajuster CSP. `cors` déjà restreint par origin dev/prod — vérifier aucun wildcard en prod.
- Toutes les routes d'écriture rate-limitées (`express-rate-limit`, pattern déjà utilisé dans `routes/contact.ts`).
- Validation stricte via Zod sur toutes les nouvelles routes (gîtes, réservations, paiements).
- Webhook Stripe : signature obligatoire, body raw uniquement sur cette route.
- Secrets jamais commités — `.env` gitignored, `.env.example` avec clés vides.
- `bcryptjs`/`jsonwebtoken` retirés une fois OIDC en place.
- Frontend : aucun secret exposé côté client (seule `VITE_STRIPE_PUBLISHABLE_KEY`, publique par nature, et `client_id` OIDC public).

### B.8 Audit sécurité

- `npm audit` (frontend + backend) avant chaque déploiement.
- Script `scripts/security-audit.sh` : scan `trivy`/`docker scout` sur les images (`postgres-maisonnettev2`, backend si dockerisé).
- `docs/security-checklist.md` : secrets non commités, webhook Stripe vérifié, rate limiting actif, HTTPS en prod, healthcheck DB vert, `npm audit` sans CVE critique.

## Phase C — Environnements + CI/CD

- 3 environnements : dev (local), recette/staging (VPS, sous-domaine dédié), prod (VPS, domaine réel). Chaque environnement a son propre `.env` et sa propre DB.
- `.github/workflows/ci.yml` (lint, tests, `npm audit`, `trivy image`, build images taguées par commit SHA), `deploy-staging.yml` (migrations + SSH + `docker compose up -d` sur VPS recette), `deploy-prod.yml` (`workflow_dispatch` = livraison 1-clic, gate obligatoire : ci.yml vert + required reviewer GitHub Environment).
- Secrets GitHub Actions scopés par environnement (`STAGING_*`, `PROD_*`), jamais réutilisés/committés.
- `docs/deployment.md` : provisioning VPS, rotation clés SSH, procédure de rollback.

*(Détail complet de la structure CI/CD dans `idp/Docs/planv1.md`, réutilisable telle quelle pour ce repo.)*

## Phase D — Observabilité + backups DR

- Sentry (`@sentry/node` backend, `@sentry/react` frontend) — contexte = commit SHA du déploiement, jamais de PII/secrets envoyés.
- Remplacer les `console.log`/`console.error` actuels (`services/email.ts`, `services/whatsapp.ts`, `middleware/error.ts`) par un logger structuré (`pino`, JSON, `request_id`/`service_name`/`severity`) — attention particulière à `middleware/error.ts` qui logue `err` complet actuellement (risque de fuite de secrets).
- Backups DB : **RPO = 24h**, **RTO = quelques heures** (objectifs par défaut, projet perso à faible trafic). `pgBackRest` (ou `pg_dump` planifié), backups chiffrés stockés hors du VPS (NAS DS124 ou bucket S3-compatible). Rétention type 7 quotidiens + 4 hebdomadaires + 3 mensuels, documentée dans `docs/backups.md`.
- **Test de restauration trimestriel obligatoire** — ajouté à `docs/security-checklist.md`.
- Scripts `scripts/backup.sh` + `scripts/restore-test.sh`.

## Vérification

- **Phase B** : `npx prisma migrate dev` applique le schema sans erreur ; `/health` reflète l'état réel de la DB (503 si DB down) ; `/api/docs` affiche Swagger UI ; login OIDC frontend redirige vers Authentik et revient avec un token valide ; backend rejette une requête protégée sans token (401), l'accepte avec un token valide ; `npm audit` sans vulnérabilité critique ; webhook Stripe avec signature invalide → rejeté.
- **Phase C** : `ci.yml` vert sur une PR de test ; `deploy-staging.yml` déploie effectivement et l'app est accessible ; `deploy-prod.yml` bloqué sans validation manuelle ; rollback testé.
- **Phase D** : erreur backend provoquée apparaît dans Sentry sans secret dans le payload ; backup manuel produit un fichier chiffré hors VPS source ; test de restauration vérifie l'intégrité des données.
