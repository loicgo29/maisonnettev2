-- CreateTable for backoffice users (simple auth, not OAuth)
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

-- Insert default admin user (password hash should be set via seed script)
-- To generate password hash: npx bcrypt-cli -c 10 '<your-password>'
-- Then update the passwordHash column via backend seed or manual SQL
-- This ensures production passwords are never in git history
