-- Recovery migration: fix failed 20260910_add_backoffice_users migration
-- This migration ensures BackofficeUser table exists with correct schema
-- even if the previous migration partially succeeded or left things in an inconsistent state.

-- Drop existing table if it exists in an incomplete state
DROP TABLE IF EXISTS "BackofficeUser" CASCADE;

-- Recreate the table with correct schema
CREATE TABLE "BackofficeUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "BackofficeUser_pkey" PRIMARY KEY ("id")
);

-- Recreate indexes
CREATE UNIQUE INDEX "BackofficeUser_username_key" ON "BackofficeUser"("username");
CREATE INDEX "BackofficeUser_username_idx" ON "BackofficeUser"("username");

-- Seed default admin user
INSERT INTO "BackofficeUser" (id, username, hash, role, active, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$wJXnobzkeME1QIU8aFDVIONr19./8XsGfi2kpZLn/WJNYaWdgMohi',
  'admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE SET
  hash = EXCLUDED.hash,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  "updatedAt" = CURRENT_TIMESTAMP;
