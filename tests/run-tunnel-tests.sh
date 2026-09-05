#!/bin/bash

set -e

echo "🧪 Running Cloudflare Tunnel BDD Tests..."
echo ""

# Check prerequisites
echo "✅ Checking prerequisites..."

if ! command -v cloudflared &> /dev/null; then
  echo "❌ cloudflared not installed. Install it with: brew install cloudflare/cloudflare/cloudflared"
  exit 1
fi

if ! command -v npx &> /dev/null; then
  echo "❌ Node.js/npm not installed"
  exit 1
fi

# Verify tunnel is running
echo "✅ Verifying tunnel is running..."
if ! cloudflared tunnel info 9fe4952e-7609-4c06-8069-dce5e16c7cad &> /dev/null; then
  echo "⚠️  Tunnel not running. Starting..."
  cloudflared tunnel run maisonnette-pecheur-bertheaume > /tmp/tunnel-test.log 2>&1 &
  sleep 3
fi

# Verify backend is running
echo "✅ Verifying backend on localhost:8030..."
if ! curl -s http://localhost:8030 > /dev/null 2>&1; then
  echo "❌ Backend not responding on localhost:8030"
  echo "   Make sure: docker compose -f docker-compose.prod.yml up -d"
  exit 1
fi

# Install dependencies
echo "✅ Installing test dependencies..."
npm install --silent 2>/dev/null || true

# Run the BDD tests
echo ""
echo "🚀 Running BDD test suite..."
echo ""

npx cucumber-js tests/features/cloudflare-tunnel.feature --require-module ts-node/esm --require 'tests/steps/cloudflare-tunnel.steps.js' --format progress-bar || true

echo ""
echo "✅ Test run complete"
echo ""
echo "📋 Summary:"
echo "  • Tunnel status: $(cloudflared tunnel info 9fe4952e-7609-4c06-8069-dce5e16c7cad 2>/dev/null | head -1)"
echo "  • Production URL: https://maisonnette-pecheur-bertheaume.fr/"
echo "  • Local backend: http://localhost:8030"
