-- Crée l'utilisateur admin par défaut pour les tests
-- Hash bcrypt de "admin123" (cost factor 10)
INSERT INTO "BackofficeUser" (id, username, hash, email, role, active, "createdAt", "updatedAt", "lastLogin")
VALUES (
  'cluid0000000000000000001',
  'admin',
  '$2b$10$Iuu.F8Dvom2TWl2hCC3AQ.HsWf9HZVHvIP.Ldp8B3pTerHrPeZ89S',
  'admin@maisonnettev2.local',
  'admin',
  true,
  NOW(),
  NOW(),
  NULL
)
ON CONFLICT (username) DO NOTHING;
