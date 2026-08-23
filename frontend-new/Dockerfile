# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend-new/package*.json ./

RUN npm ci

COPY frontend-new/ .

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY frontend-new/package*.json ./

EXPOSE 5173

CMD ["node", "-e", "require('esbuild').serve({ servedir: 'build', port: 5173 }, {}).then(server => console.log('📱 Frontend running on port 5173'))"]
