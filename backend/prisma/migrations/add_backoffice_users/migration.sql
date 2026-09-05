-- CreateTable for backoffice users (simple auth, username + bcrypt hash)
-- NOTE: PostgreSQL auto-creates unique index from UNIQUE constraint,
-- so we do NOT create it again manually.
CREATE TABLE IF NOT EXISTS "BackofficeUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "hash" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP
);
