-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "gmailUid" TEXT;
CREATE UNIQUE INDEX "Invoice_gmailUid_key" ON "Invoice"("gmailUid");
