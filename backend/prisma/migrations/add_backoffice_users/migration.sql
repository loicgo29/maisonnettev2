-- CreateTable for backoffice users (simple auth, username + bcrypt hash)
CREATE TABLE IF NOT EXISTS "BackofficeUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "hash" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME
);

-- Create index for fast lookups
CREATE UNIQUE INDEX "BackofficeUser_username_key" ON "BackofficeUser"("username");
