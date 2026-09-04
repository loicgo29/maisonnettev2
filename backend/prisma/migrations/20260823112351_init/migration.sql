-- CreateTable
CREATE TABLE "Gite" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "prixNuit" DOUBLE PRECISION NOT NULL,
    "googleCalendarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "giteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "giteId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PENDING',
    "clientNom" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,
    "googleCalendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gite_slug_key" ON "Gite"("slug");

-- CreateIndex
CREATE INDEX "Gite_slug_idx" ON "Gite"("slug");

-- CreateIndex
CREATE INDEX "Photo_giteId_idx" ON "Photo"("giteId");

-- CreateIndex
CREATE INDEX "Photo_categorie_idx" ON "Photo"("categorie");

-- CreateIndex
CREATE INDEX "Reservation_giteId_idx" ON "Reservation"("giteId");

-- CreateIndex
CREATE INDEX "Reservation_statut_idx" ON "Reservation"("statut");

-- CreateIndex
CREATE INDEX "Reservation_dateDebut_dateFin_idx" ON "Reservation"("dateDebut", "dateFin");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_giteId_fkey" FOREIGN KEY ("giteId") REFERENCES "Gite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_giteId_fkey" FOREIGN KEY ("giteId") REFERENCES "Gite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
