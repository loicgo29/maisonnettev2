#!/bin/bash
# Initialisation de la base Keycloak
# Exécuté automatiquement par PostgreSQL au premier démarrage

set -e

echo "Initialisation de la base Keycloak..."

# Créer l'utilisateur et la base Keycloak
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Créer l'utilisateur Keycloak
  CREATE USER keycloak WITH PASSWORD '$KC_DB_PASSWORD';

  -- Créer la base Keycloak
  CREATE DATABASE keycloak OWNER keycloak;

  -- Accorder les permissions
  GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
EOSQL

# Se connecter à la base keycloak et configurer les permissions du schéma
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "keycloak" <<-EOSQL
  GRANT ALL PRIVILEGES ON SCHEMA public TO keycloak;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO keycloak;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO keycloak;
EOSQL

echo "✅ Base Keycloak initialisée"
