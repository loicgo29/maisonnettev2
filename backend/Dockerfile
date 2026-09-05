# Build stage
# Build v2 - Force rebuild (2026-09-04)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# `prisma generate` AVANT `npm run build` : TypeScript a besoin des types du
# client Prisma pour compiler. Dans l'ordre inverse, les relations remontaient
# en `any` et la compilation échouait sur noImplicitAny — alors qu'elle passait
# en local, où le client avait été généré séparément.
#
# L'URL est factice : la génération ne se connecte pas, elle lit seulement le
# schéma. Pas de `|| true` : un échec ici doit arrêter la construction, sinon
# le build suivant échoue avec un message trompeur.
RUN DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" npx prisma generate

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Sans openssl, la détection de Prisma retombe sur le moteur openssl-1.1.x,
# absent d'Alpine 3 : le conteneur démarre puis meurt sur libssl.so.1.1.
RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Schéma, migrations et seed : nécessaires au provisionnement au déploiement.
COPY --from=builder /app/prisma ./prisma
# Photos livrées avec l'image ; elles alimentent le volume uploads_data.
COPY --from=builder /app/public ./public
COPY package*.json ./
# Applique `prisma migrate deploy` avant npm start : sans lui, une base vide
# reste sans tables et l'application sert des erreurs P2021.
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
