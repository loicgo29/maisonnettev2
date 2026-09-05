#!/bin/sh
# Create .env from container environment variables
# This is the only way to inject runtime env vars into SvelteKit preview

cat > /app/.env << EOF
PRIVATE_GOOGLE_CLIENT_ID=${PRIVATE_GOOGLE_CLIENT_ID}
PRIVATE_GOOGLE_CLIENT_SECRET=${PRIVATE_GOOGLE_CLIENT_SECRET}
PRIVATE_GOOGLE_REDIRECT_URI=${PRIVATE_GOOGLE_REDIRECT_URI}
PRIVATE_GITE_CALENDAR_ID=${PRIVATE_GITE_CALENDAR_ID}
PUBLIC_AUTH_URL=${PUBLIC_AUTH_URL}
PUBLIC_AUTH_REALM=${PUBLIC_AUTH_REALM}
PUBLIC_AUTH_CLIENT_ID=${PUBLIC_AUTH_CLIENT_ID}
EOF

echo "✅ .env created from environment variables"
cat /app/.env | head -3

# Start SvelteKit preview
exec npm run preview
