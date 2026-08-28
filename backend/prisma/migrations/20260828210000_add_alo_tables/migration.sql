-- CreateTable
CREATE TABLE "alo_accounts" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "owner" TEXT,
    "current_balance" DECIMAL(10,2),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "alo_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alo_expenses" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "category" TEXT,
    "source" TEXT,
    "status" TEXT,
    "comment" TEXT,
    "sharing_mode" TEXT,
    "account_id" INTEGER NOT NULL,
    "period_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alo_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alo_periods" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alo_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alo_expenses_account_id_idx" ON "alo_expenses"("account_id");

-- CreateIndex
CREATE INDEX "alo_expenses_period_id_idx" ON "alo_expenses"("period_id");

-- AddForeignKey
ALTER TABLE "alo_expenses" ADD CONSTRAINT "alo_expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "alo_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

