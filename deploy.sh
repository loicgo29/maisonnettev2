#!/usr/bin/env bash
#
# Déploiement de maisonnette-pecheur-bertheaume.fr sur le serveur Hetzner.
#
# Idempotent : rejouable autant de fois que nécessaire. Provisionne les images,
# la base (migrations + données) et les photos.
#
#   ./deploy.sh
#
set -euo pipefail

# La surcharge Hetzner est indispensable, pas optionnelle : sans elle, Caddy
# republierait 127.0.0.1:8030 (l'ancien schéma Mac Mini derrière un tunnel
# Cloudflare) au lieu de 80/443 en direct, et le port 3001 du backend
# resterait exposé sur l'hôte. Voir DEPLOY.md.
COMPOSE="docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml --env-file .env"
PORT_LOCAL=80  # Caddy publié en direct, plus de tunnel ni de port dédié
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RACINE"

info() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ko()   { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; }

# --- Préalables ---------------------------------------------------------------
info 'Vérification des préalables'

[ -f .env ] || { ko '.env absent — copier .env.example et renseigner DB_PASSWORD'; exit 1; }

for var in DOMAIN DB_USER DB_PASSWORD DB_NAME; do
  if ! grep -qE "^${var}=.+" .env; then
    ko "$var manquant ou vide dans .env"; exit 1
  fi
done
ok '.env complet'

NB_PHOTOS=$(find backend/public/uploads/gites -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) 2>/dev/null | wc -l | tr -d ' ')
[ "$NB_PHOTOS" -gt 0 ] || { ko 'aucune photo dans backend/public/uploads/gites'; exit 1; }
ok "$NB_PHOTOS photos présentes dans le dépôt"

# --- Construction et démarrage ------------------------------------------------
info 'Construction des images et démarrage'
$COMPOSE up -d --build
ok 'conteneurs démarrés'

info 'Attente de la base'
for _ in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 2
done
$COMPOSE exec -T postgres pg_isready -q || { ko 'base injoignable'; exit 1; }
ok 'base prête'

# --- Photos -------------------------------------------------------------------
# Le volume uploads_data est peuplé par l'image au premier démarrage seulement.
# On resynchronise explicitement pour que les photos ajoutées depuis soient
# bien publiées.
info 'Synchronisation des photos vers le volume'
$COMPOSE cp backend/public/uploads/. backend:/app/public/uploads/
NB_VOLUME=$($COMPOSE exec -T backend sh -c \
  "find /app/public/uploads/gites -type f \\( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \\) | wc -l" \
  | tr -d ' \r')
ok "$NB_VOLUME photos dans le volume"

if [ "$NB_VOLUME" -lt "$NB_PHOTOS" ]; then
  ko "photos manquantes dans le volume ($NB_VOLUME < $NB_PHOTOS)"; exit 1
fi

# --- Base de données ----------------------------------------------------------
info 'Migrations et provisionnement des données'
$COMPOSE exec -T backend npx prisma migrate deploy
ok 'schéma à jour'

$COMPOSE exec -T backend npm run db:seed
ok 'données provisionnées'

# --- Vérifications ------------------------------------------------------------
info 'Vérifications de bout en bout'

for _ in $(seq 1 30); do
  curl -sf -m 3 "http://127.0.0.1:${PORT_LOCAL}/api/gites" >/dev/null 2>&1 && break
  sleep 2
done

REPONSE=$(curl -sf -m 5 "http://127.0.0.1:${PORT_LOCAL}/api/gites" 2>/dev/null || echo '[]')
NB_BASE=$(printf '%s' "$REPONSE" | grep -o '"url"' | wc -l | tr -d ' ')

[ "$NB_BASE" -gt 0 ] || { ko "l'API ne renvoie aucune photo"; exit 1; }
ok "API : $NB_BASE photos référencées"

PREMIERE=$(printf '%s' "$REPONSE" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
if curl -sf -m 5 -o /dev/null "http://127.0.0.1:${PORT_LOCAL}${PREMIERE}"; then
  ok "photo d'accueil servie : ${PREMIERE##*/}"
else
  ko "photo d'accueil injoignable : $PREMIERE"; exit 1
fi

CODE=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT_LOCAL}/")
[ "$CODE" = '200' ] || { ko "la page d'accueil répond $CODE"; exit 1; }
ok 'page du gîte servie (200)'

printf '\n\033[32m✓ Déploiement terminé\033[0m\n'
printf '  Local  : http://127.0.0.1:%s\n' "$PORT_LOCAL"
printf '  Public : https://%s\n\n' "$(grep -E '^DOMAIN=' .env | cut -d= -f2)"
