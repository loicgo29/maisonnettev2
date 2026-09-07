#!/bin/bash

# 🔍 Agent de Validation Pre-Livraison - Backend ALO
# Exécute une checklist complète avant de permettre un push

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔍 Agent de Validation Pre-Livraison - Backend"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteur d'erreurs
ERRORS=0

# 1️⃣ Vérifier la syntaxe Python
echo "🐍 Vérification syntaxe Python..."
if python3 -m py_compile app/**/*.py 2>/dev/null; then
    echo -e "${GREEN}✅ Syntaxe Python OK${NC}"
else
    echo -e "${RED}❌ Erreur syntaxe Python${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2️⃣ Vérifier les imports
echo ""
echo "📦 Vérification des imports..."
if python3 -c "import app.main" 2>/dev/null; then
    echo -e "${GREEN}✅ Imports OK${NC}"
else
    echo -e "${RED}❌ Erreur imports${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3️⃣ Vérifier la présence de secrets
echo ""
echo "🔐 Vérification des secrets (API keys, tokens)..."
if grep -r "sk-\|api_key\|secret_key" app/ 2>/dev/null | grep -v ".env\|.gitignore\|# noqa"; then
    echo -e "${RED}⚠️  Secrets détectés dans le code!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Aucun secret en dur${NC}"
fi

# 4️⃣ Exécuter les agents de qualité
echo ""
echo "🤖 Exécution des agents de qualité..."

# Data-Quality Agent
if python3 scripts/data-quality-check.py; then
    :
else
    ERRORS=$((ERRORS + 1))
fi

# Integration-Test Agent
echo ""
if python3 scripts/integration-tests.py; then
    :
else
    ERRORS=$((ERRORS + 1))
fi

# Regression-Monitor Agent
echo ""
if python3 scripts/regression-check.py; then
    :
else
    echo -e "${YELLOW}⚠️  Régression détectée (warning seulement)${NC}"
fi

# 6️⃣ Vérifier les fichiers non-commités
echo ""
echo "📝 Vérification des fichiers non-commités..."
if git status --porcelain | grep -E "^\s*M\s" >/dev/null; then
    echo -e "${YELLOW}⚠️  Fichiers modifiés non-commités:${NC}"
    git status --porcelain
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Tous les fichiers commités${NC}"
fi

# 7️⃣ Checklist manuelle
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
    ask_confirmation "✅ Tests backend passent (uv run pytest)?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Type checking OK (mypy si applicable)?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Code reviewé et approuvé?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Agents OK (data-quality, integration, regression)?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Documentation mise à jour?" || ERRORS=$((ERRORS + 1))
    ask_confirmation "✅ Déploiement local testé (docker-compose)?" || ERRORS=$((ERRORS + 1))
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
