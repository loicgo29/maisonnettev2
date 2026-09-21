#!/bin/bash
# Installe les git hooks versionnés (scripts/hooks/) dans .git/hooks/.
# .git/hooks/ n'est pas versionné par git, donc chaque poste doit lancer
# ce script une fois après le clone (ou après un pull qui ajoute un hook).
#
# Usage: ./scripts/install-hooks.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for hook in "$ROOT"/scripts/hooks/*; do
  name="$(basename "$hook")"
  cp "$hook" "$ROOT/.git/hooks/$name"
  chmod +x "$ROOT/.git/hooks/$name"
  echo "✅ hook installé: $name"
done
