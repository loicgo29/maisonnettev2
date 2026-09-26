-- CreateTable sage_tokens
CREATE TABLE IF NOT EXISTS "comptabilite"."sage_tokens" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sage_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable sage_invoices
CREATE TABLE IF NOT EXISTS "comptabilite"."sage_invoices" (
    "id" TEXT NOT NULL,
    "localInvoiceId" TEXT,
    "sageInvoiceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sage_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex sage_invoices_sageInvoiceId_key
CREATE UNIQUE INDEX IF NOT EXISTS "sage_invoices_sageInvoiceId_key" ON "comptabilite"."sage_invoices"("sageInvoiceId");
