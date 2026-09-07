#!/bin/bash

# 🔍 Agent de Validation Pre-Livraison - Frontend ALO
# Exécute une checklist complète avant de permettre un push

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔍 Agent de Validation Pre-Livraison - Frontend"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteur d'erreurs
ERRORS=0

# 1️⃣ Vérifier le build TypeScript
echo "📦 Vérification du build TypeScript..."
if npm run build >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Build TypeScript OK${NC}"
else
    echo -e "${RED}❌ Erreur build TypeScript${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2️⃣ Vérifier les types (optionnel si type-check existe)
echo ""
if npm run 2>/dev/null | grep -q "type-check"; then
    echo "🔍 Vérification des types TypeScript..."
    if npm run type-check >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Type-check OK${NC}"
    else
        echo -e "${RED}❌ Erreur type-check${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${GREEN}✅ Type-check non configuré (optionnel)${NC}"
fi

# 3️⃣ Vérifier les erreurs console
echo ""
echo "🎯 Vérification des secrets (API keys)..."
if grep -r "sk-\|api_key\|secret_key" src/ 2>/dev/null | grep -v ".env\|.gitignore"; then
    echo -e "${RED}⚠️  Secrets détectés dans le code!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Aucun secret en dur${NC}"
fi

# 4️⃣ Vérifier les fichiers non-commités
echo ""
echo "📝 Vérification des fichiers non-commités..."
if git status --porcelain | grep -E "^\s*M\s" >/dev/null; then
    echo -e "${YELLOW}⚠️  Fichiers modifiés non-commités:${NC}"
    git status --porcelain
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Tous les fichiers commités${NC}"
fi

# 5️⃣ Checklist manuelle
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 Checklist Recette Manuelle"
echo "═══════════════════════════════════════════════════════════"
echo ""

ask_confirmation() {
    local prompt="$1"
    local response

    # Si pas de TTY interactif (CI/CD, piped, etc), skip les confirmations
    if [ ! -t 0 ]; then
        return 0
    fi

    read -p "$prompt (y/n) " -n 1 -r response
    echo
    if [[ ! $response =~ ^[Yy]$ ]]; then
        return 1
    fi
    return 0
}

# Checklist interactive (skippé si pas de terminal)
if [ -t 0 ]; then
    ask_confirmation "✅ Tests unitaires passent (npm run test)?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Tests e2e passent?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Feature testée dans le navigateur?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Aucune erreur console (F12)?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Responsive design vérifié?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Code reviewé et approuvé?" || ERRORS=$((ERRORS + 1))
else
    echo -e "${YELLOW}⚠️  Mode non-interactif: checklist skippée${NC}"
    echo "💡 Lance le hook manuellement pour vérifier avant de pusher"
fi

# Résultat final
echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION COMPLÈTE - Tu peux push!${NC}"
    echo "═══════════════════════════════════════════════════════════"
    exit 0
else
    echo -e "${RED}❌ VALIDATION ÉCHOUÉE ($ERRORS erreur(s))${NC}"
    echo "═══════════════════════════════════════════════════════════"
    exit 1
fi
