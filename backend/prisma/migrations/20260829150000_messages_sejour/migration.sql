-- Séquence de messages accompagnant le séjour, et champs de saisie manuelle
-- des réservations (elles proviennent d'Airbnb, Booking ou Leboncoin).
--
-- Écrite à la main plutôt que générée : `prisma migrate diff` proposait de
-- DÉTRUIRE et recréer la table Reservation, parce que la migration initiale
-- l'avait créée sans `@@schema("public")`. Appliquée telle quelle, elle aurait
-- effacé les réservations de production.

-- Saisie manuelle : le prénom est distinct du nom, la plateforme d'origine est
-- conservée, et l'adresse e-mail devient facultative — Airbnb et Leboncoin la
-- masquent souvent derrière un alias ou leur messagerie interne.
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "clientPrenom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "plateforme" TEXT NOT NULL DEFAULT 'DIRECT';
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "notesInternes" TEXT;

-- Suivi des paiements : utile aux réservations directes et Leboncoin, Airbnb
-- et Booking encaissant eux-mêmes. N'entre dans aucune règle d'envoi.
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "acompteVerse" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "soldeVerse" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Reservation" ALTER COLUMN "clientEmail" DROP NOT NULL;

-- Les sept messages du séjour.
CREATE TABLE IF NOT EXISTS "MessageSejour" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    -- CANAL | GUIDE | RAPPEL_ARRIVEE | ARRIVEE_OK | PLANTES | CHECKOUT | RETOUR
    "type" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'EMAIL',
    -- PLANIFIE | ENVOYE | ECHEC | ANNULE | IMPOSSIBLE
    -- IMPOSSIBLE distingue « pas d'adresse e-mail » d'un échec d'envoi : le
    -- backoffice peut alors proposer de saisir l'adresse au lieu de réessayer.
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "planifieLe" TIMESTAMP(3) NOT NULL,
    "envoyeLe" TIMESTAMP(3),
    "erreur" TEXT,
    "sujet" TEXT,
    "corps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageSejour_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MessageSejour_reservationId_idx" ON "MessageSejour"("reservationId");
CREATE INDEX IF NOT EXISTS "MessageSejour_statut_planifieLe_idx" ON "MessageSejour"("statut", "planifieLe");

-- Garde-fou en base, pas seulement dans le code : deux exécutions simultanées
-- du planificateur ne peuvent pas créer deux fois le même message.
CREATE UNIQUE INDEX IF NOT EXISTS "MessageSejour_reservationId_type_key" ON "MessageSejour"("reservationId", "type");

-- ADD CONSTRAINT n'accepte pas IF NOT EXISTS : sans ce test, rejouer la
-- migration échoue. Prisma ne la rejoue normalement pas, mais une migration
-- non idempotente est un piège lors d'une reprise manuelle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageSejour_reservationId_fkey'
  ) THEN
    ALTER TABLE "MessageSejour"
      ADD CONSTRAINT "MessageSejour_reservationId_fkey"
      FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
