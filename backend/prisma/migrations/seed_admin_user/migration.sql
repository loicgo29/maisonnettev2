-- Seed default admin user for backoffice
-- Username: admin
-- Password: admin123logo (hashed with bcrypt)
INSERT INTO "BackofficeUser" (id, username, hash, role, active)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$wJXnobzkeME1QIU8aFDVIONr19./8XsGfi2kpZLn/WJNYaWdgMohi',
  'admin',
  true
)
ON CONFLICT (username) DO UPDATE SET
  hash = EXCLUDED.hash,
  role = EXCLUDED.role,
  active = EXCLUDED.active;
