#!/bin/sh
# Applique les migrations Prisma avant de démarrer l'application.
#
# Sans cette étape, le conteneur lançait `npm start` et rien d'autre : sur une
# base vide, aucune table n'était créée, l'application démarrait quand même et
# chaque requête échouait en P2021 « table does not exist ». Constaté le
# 2026-08-28 en local ; sur un PostgreSQL managé neuf, cela casse le tout
# premier déploiement.

set -e

echo "🔄 Application des migrations Prisma..."

if npx prisma migrate deploy; then
  echo "✅ Migrations appliquées"
else
  # Échouer bruyamment plutôt que servir une base incomplète : une application
  # qui répond avec des tables manquantes est plus difficile à diagnostiquer
  # qu'un conteneur qui refuse de démarrer.
  echo "❌ Échec des migrations — démarrage interrompu"
  echo "   Vérifier DATABASE_URL et l'accessibilité de la base."
  exit 1
fi

echo "🌱 Seeding données par défaut..."
if tsx prisma/seed.ts; then
  echo "✅ Seed appliqué"
else
  echo "⚠️  Seed failed but continuing (may already exist)"
fi

exec "$@"
