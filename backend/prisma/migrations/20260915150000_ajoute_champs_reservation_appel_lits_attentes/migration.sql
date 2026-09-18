-- AlterTable
ALTER TABLE "public"."Reservation"
  ADD COLUMN     "appelerParPrenom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "nombreLits" INTEGER,
  ADD COLUMN     "attentesClient" TEXT;
