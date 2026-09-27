-- CreateTable GourmElonExpense
CREATE TABLE "gourmelon_expenses" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "who" VARCHAR(255) NOT NULL DEFAULT 'Loïc',
    "for_whom" VARCHAR(255) NOT NULL,
    "when" TIMESTAMP NOT NULL,
    "what" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "gourmelon_expenses_when_idx" ON "gourmelon_expenses"("when");
