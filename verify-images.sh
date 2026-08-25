#!/bin/bash
set -e

echo "════════════════════════════════════════════════════════════════"
echo "📸 VÉRIFICATION DE L'AFFICHAGE DES PHOTOS"
echo "════════════════════════════════════════════════════════════════"
echo ""

PHOTOS=(
  "IMG_0618.JPG"
  "IMG_0627.JPG"
  "IMG_0632.JPG"
  "IMG_0621.JPG"
  "GOPR5979.JPG"
  "IMG_0613.JPG"
  "IMG_0619.JPG"
  "GOPR5983.JPG"
)

SUCCESS=0
FAILED=0

for photo in "${PHOTOS[@]}"; do
  echo "🔍 Vérifying: $photo"

  # Test 1: Fichier existe
  if [ ! -f "/Volumes/logousb/SSD/Projects/maisonnettev2/frontend/static/images/$photo" ]; then
    echo "  ❌ Fichier manquant"
    ((FAILED++))
    continue
  fi

  # Test 2: Accessible via HTTP
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173/images/$photo")
  if [ "$HTTP_CODE" != "200" ]; then
    echo "  ❌ HTTP $HTTP_CODE (attendu 200)"
    ((FAILED++))
    continue
  fi

  # Test 3: Taille de fichier
  SIZE=$(ls -lh "/Volumes/logousb/SSD/Projects/maisonnettev2/frontend/static/images/$photo" | awk '{print $5}')

  echo "  ✅ OK - HTTP 200 - Taille: $SIZE"
  ((SUCCESS++))
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 RÉSUMÉ"
echo "════════════════════════════════════════════════════════════════"
echo "✅ Réussies: $SUCCESS / ${#PHOTOS[@]}"
echo "❌ Échouées:  $FAILED / ${#PHOTOS[@]}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 TOUTES LES PHOTOS S'AFFICHENT CORRECTEMENT!"
  echo ""
  echo "URL: http://localhost:5173"
  echo ""
  exit 0
else
  echo "⚠️  Problèmes détectés"
  exit 1
fi
