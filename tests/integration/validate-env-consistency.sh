#!/bin/bash
# Validate .env files have required variables across all environments
# Purpose: Catch missing DATABASE_URL before CI/CD deployment
# Location: tests/integration/validate-env-consistency.sh
# Run in CI pipeline: npm run test:env-consistency

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📋 ENV Consistency Validation"
echo "   Project root: $PROJECT_ROOT"
echo ""

# Variables REQUIRED in ALL .env files (no defaults allowed)
REQUIRED_VARS=(
  "DB_USER"
  "DB_PASSWORD"
  "DB_NAME"
  "DB_HOST"
  "DB_PORT"
  "DATABASE_URL"  # ← CRITICAL: must be explicit, not derived from docker-compose
)

# Variables REQUIRED for SvelteKit frontend build (PUBLIC_* are hardcoded at build time)
REQUIRED_PUBLIC_VARS=(
  "PUBLIC_AUTH_URL"
  "PUBLIC_AUTH_REALM"
  "PUBLIC_AUTH_CLIENT_ID"
)

validate_file() {
  local env_file=$1
  local is_required=$2
  local status=0

  if [ ! -f "$env_file" ]; then
    if [ "$is_required" = "true" ]; then
      echo "❌ $env_file: REQUIRED but NOT FOUND"
      return 1
    else
      echo "⏭️  $env_file: Optional, skipping"
      return 0
    fi
  fi

  echo "🔍 Validating $env_file..."

  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" "$env_file"; then
      local value=$(grep "^$var=" "$env_file" | cut -d= -f2)
      if [ -z "$value" ]; then
        echo "  ❌ $var: EMPTY VALUE"
        status=1
      else
        # Mask password for display
        if [ "$var" = "DB_PASSWORD" ]; then
          echo "  ✅ $var (***)"
        elif [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"SECRET"* ]]; then
          echo "  ✅ $var (***)"
        else
          echo "  ✅ $var"
        fi
      fi
    else
      echo "  ❌ $var: MISSING"
      status=1
    fi
  done

  return $status
}

# Validation: test environment (REQUIRED)
if ! validate_file ".env.test" "true"; then
  echo ""
  echo "❌ Test environment validation failed"
  echo "   Issue: Missing required variables in .env.test"
  echo "   Fix: Add missing variables to .env.test"
  echo ""
  echo "   Required: $(echo ${REQUIRED_VARS[@]} | tr ' ' ', ')"
  exit 1
fi

# Validation: production environment (if exists locally)
if [ -f ".env" ]; then
  if ! validate_file ".env" "false"; then
    echo ""
    echo "❌ Production environment validation failed"
    echo "   Issue: Missing required variables in .env"
    echo "   Fix: Add missing variables to .env"
    exit 1
  fi
fi

echo ""
echo "🔍 Checking SvelteKit frontend variables..."
frontend_status=0
for var in "${REQUIRED_PUBLIC_VARS[@]}"; do
  if grep -q "^$var=" .env.test; then
    echo "  ✅ $var"
  else
    echo "  ❌ $var: MISSING"
    frontend_status=1
  fi
done

if [ $frontend_status -ne 0 ]; then
  echo ""
  echo "❌ Frontend environment incomplete"
  echo "   SvelteKit PUBLIC_* vars required for build"
  echo "   Add these to .env.test:"
  echo "   $(echo ${REQUIRED_PUBLIC_VARS[@]} | tr ' ' '\n' | sed 's/^/   /')"
  exit 1
fi

echo ""
echo "✅ ALL ENVIRONMENTS VALID"
echo "   Backend + Frontend variables present"
echo "   Ready for build & deployment"
