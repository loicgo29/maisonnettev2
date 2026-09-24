-- CreateSchema comptabilite
CREATE SCHEMA IF NOT EXISTS "comptabilite";

-- CreateTable comptabilite.invoices
CREATE TABLE "comptabilite"."invoices" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountHT" DOUBLE PRECISION,
    "amountTVA" DOUBLE PRECISION,
    "vendor" TEXT NOT NULL,
    "description" TEXT,
    "pdfUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "pennylaneInvoiceId" TEXT,
    "gmailUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable comptabilite.transactions
CREATE TABLE "comptabilite"."transactions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable comptabilite.matches
CREATE TABLE "comptabilite"."matches" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'matched',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable comptabilite.sync_logs
CREATE TABLE "comptabilite"."sync_logs" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "transactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex comptabilite.invoices
CREATE UNIQUE INDEX "invoices_gmailUid_key" ON "comptabilite"."invoices"("gmailUid");

-- CreateIndex comptabilite.matches
CREATE UNIQUE INDEX "matches_invoiceId_transactionId_key" ON "comptabilite"."matches"("invoiceId", "transactionId");

-- AddForeignKey comptabilite.matches
ALTER TABLE "comptabilite"."matches" ADD CONSTRAINT "matches_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "comptabilite"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey comptabilite.matches
ALTER TABLE "comptabilite"."matches" ADD CONSTRAINT "matches_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "comptabilite"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey comptabilite.sync_logs
ALTER TABLE "comptabilite"."sync_logs" ADD CONSTRAINT "sync_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "comptabilite"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey comptabilite.sync_logs
ALTER TABLE "comptabilite"."sync_logs" ADD CONSTRAINT "sync_logs_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "comptabilite"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
