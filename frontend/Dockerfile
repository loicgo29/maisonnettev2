# --- Build ---
FROM node:20-alpine AS builder

ARG PRIVATE_GOOGLE_CLIENT_ID
ARG PRIVATE_GOOGLE_CLIENT_SECRET
ARG PRIVATE_GOOGLE_REDIRECT_URI
ARG PRIVATE_GITE_CALENDAR_ID
ARG PUBLIC_AUTH_URL
ARG PUBLIC_AUTH_REALM
ARG PUBLIC_AUTH_CLIENT_ID

ENV PRIVATE_GOOGLE_CLIENT_ID=$PRIVATE_GOOGLE_CLIENT_ID
ENV PRIVATE_GOOGLE_CLIENT_SECRET=$PRIVATE_GOOGLE_CLIENT_SECRET
ENV PRIVATE_GOOGLE_REDIRECT_URI=$PRIVATE_GOOGLE_REDIRECT_URI
# PUBLIC_* est intégré au bundle client par SvelteKit à la construction :
# doit être présent à ce stade, une variable d'exécution serait ignorée.
ENV PUBLIC_AUTH_URL=$PUBLIC_AUTH_URL
ENV PUBLIC_AUTH_REALM=$PUBLIC_AUTH_REALM
ENV PUBLIC_AUTH_CLIENT_ID=$PUBLIC_AUTH_CLIENT_ID
ENV PRIVATE_GITE_CALENDAR_ID=$PRIVATE_GITE_CALENDAR_ID

WORKDIR /app

# Create .env for SvelteKit build-time compilation
# (SvelteKit $env/static/private requires .env at build time)
RUN cat > .env << EOF
PRIVATE_GOOGLE_CLIENT_ID=${PRIVATE_GOOGLE_CLIENT_ID}
PRIVATE_GOOGLE_CLIENT_SECRET=${PRIVATE_GOOGLE_CLIENT_SECRET}
PRIVATE_GOOGLE_REDIRECT_URI=${PRIVATE_GOOGLE_REDIRECT_URI}
PRIVATE_GITE_CALENDAR_ID=${PRIVATE_GITE_CALENDAR_ID}
PUBLIC_AUTH_URL=${PUBLIC_AUTH_URL}
PUBLIC_AUTH_REALM=${PUBLIC_AUTH_REALM}
PUBLIC_AUTH_CLIENT_ID=${PUBLIC_AUTH_CLIENT_ID}
EOF

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Production ---
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:3001
ENV HOST=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.svelte-kit ./.svelte-kit
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/static ./static
COPY --from=builder /app/.env ./.env

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5173/ || exit 1

CMD ["npm", "run", "preview"]
