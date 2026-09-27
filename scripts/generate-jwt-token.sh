#!/bin/bash
# Generate a JWT token for testing admin endpoints locally

JWT_SECRET="${JWT_SECRET:-development-key-insecure}"
ADMIN_ID="${ADMIN_ID:-admin-test-$(date +%s)}"

# Generate JWT token using Node.js
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: '$ADMIN_ID', role: 'admin', iat: Math.floor(Date.now() / 1000) },
  '$JWT_SECRET',
  { expiresIn: '24h' }
);
console.log(token);
")

echo "🔑 JWT Token (admin) — Valid for 24h"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Usage in curl:"
echo "  curl -H 'Authorization: Bearer $TOKEN' http://localhost:3001/api/admin/comptabilite/oauth/health"
echo ""
echo "💾 Or set as variable:"
echo "  export ADMIN_TOKEN=\"$TOKEN\""
