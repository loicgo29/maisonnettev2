#!/usr/bin/env bash
#
# Copie le schéma `alo` vers la base de maisonnettev2.
#
# La source n'est jamais modifiée : elle reste la référence tant que la copie
# n'a pas été validée, et le retour arrière consiste à y repointer alo.
#
# Usage :
#   scripts/migrer-schema-alo.sh <conteneur-source> <base-source> <conteneur-cible> <base-cible> [utilisateur-cible]
#
# Exemple en local :
#   scripts/migrer-schema-alo.sh postgres-shared logo postgres-maisonnettev2 maisonnettev2
#
set -euo pipefail

SRC_CONTENEUR=${1:?conteneur source attendu}
SRC_BASE=${2:?base source attendue}
DST_CONTENEUR=${3:?conteneur cible attendu}
DST_BASE=${4:?base cible attendue}
DST_USER=${5:-maisonnettev2}
SRC_USER=${SRC_USER:-postgres}

TRAVAIL=$(mktemp -d)
trap 'rm -rf "$TRAVAIL"' EXIT

# Les mêmes agrégats des deux côtés : un écart d'un centime ou d'un repas doit
# arrêter la bascule, pas être découvert plus tard dans un rééquilibrage faux.
CONTROLE="SELECT
  (SELECT count(*) FROM alo.expenses),
  (SELECT sum(amount) FROM alo.expenses),
  (SELECT count(*) FROM alo.meal_records),
  (SELECT sum(repas) FROM alo.meal_records),
  (SELECT count(*) FROM alo.sharing_entries),
  (SELECT sum(amount) FROM alo.sharing_entries),
  (SELECT count(*) FROM alo.accounts),
  (SELECT count(*) FROM alo.periods);"

echo "→ Sauvegarde de la base cible"
docker exec "$DST_CONTENEUR" pg_dump -U "$DST_USER" "$DST_BASE" \
  | gzip > "backups/avant-migration-alo-$(date +%Y%m%d-%H%M%S).sql.gz"

echo "→ Relevé de la source"
docker exec "$SRC_CONTENEUR" psql -U "$SRC_USER" -d "$SRC_BASE" -t -A -F'|' -c "$CONTROLE" \
  > "$TRAVAIL/avant.txt"

echo "→ Copie du schéma alo"
docker exec "$SRC_CONTENEUR" pg_dump -U "$SRC_USER" -d "$SRC_BASE" \
  --schema=alo --no-owner --no-privileges > "$TRAVAIL/alo.sql"
docker exec -i "$DST_CONTENEUR" psql -U "$DST_USER" -d "$DST_BASE" -v ON_ERROR_STOP=1 \
  < "$TRAVAIL/alo.sql" > "$TRAVAIL/restauration.log"

# pg_dump reporte la valeur courante des séquences, or celles d'alo sont déjà
# en retard sur les données à la source (constaté le 2026-09-06 : expenses à 986
# pour un identifiant maximal de 1095). Sans ce rattrapage, la première création
# de dépense échoue sur une violation de clé primaire.
echo "→ Resynchronisation des séquences"
docker exec "$DST_CONTENEUR" psql -U "$DST_USER" -d "$DST_BASE" -q <<'SQL'
SELECT setval('alo.expenses_id_seq',         (SELECT max(id) FROM alo.expenses));
SELECT setval('alo.meal_records_id_seq',     (SELECT max(id) FROM alo.meal_records));
SELECT setval('alo.sharing_entries_id_seq',  (SELECT max(id) FROM alo.sharing_entries));
SELECT setval('alo.periods_id_seq',          (SELECT max(id) FROM alo.periods));
SELECT setval('alo.accounts_id_seq',         (SELECT max(id) FROM alo.accounts));
SELECT setval('alo.account_balances_id_seq', GREATEST((SELECT coalesce(max(id),0) FROM alo.account_balances),1));
SELECT setval('alo.children_id_seq',         GREATEST((SELECT coalesce(max(id),0) FROM alo.children),1));
SELECT setval('alo.meal_presence_id_seq',    GREATEST((SELECT coalesce(max(id),0) FROM alo.meal_presence),1));
SELECT setval('alo.presence_periods_id_seq', GREATEST((SELECT coalesce(max(id),0) FROM alo.presence_periods),1));
SQL

echo "→ Vérification"
docker exec "$DST_CONTENEUR" psql -U "$DST_USER" -d "$DST_BASE" -t -A -F'|' -c "$CONTROLE" \
  > "$TRAVAIL/apres.txt"

if diff -q "$TRAVAIL/avant.txt" "$TRAVAIL/apres.txt" >/dev/null; then
  echo "✅ Source et copie concordent : $(cat "$TRAVAIL/apres.txt")"
else
  echo "❌ ÉCART entre la source et la copie — ne pas basculer"
  echo "   source : $(cat "$TRAVAIL/avant.txt")"
  echo "   copie  : $(cat "$TRAVAIL/apres.txt")"
  exit 1
fi

cat <<'FIN'

Reste à faire, une fois cette copie validée :
  - comparer les chiffres du rééquilibrage à tests/fixtures/alo/*.json
  - repointer alo (DATABASE_URL) vers cette base
La source n'a pas été modifiée : y repointer alo suffit à revenir en arrière.
FIN
