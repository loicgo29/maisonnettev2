FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY svelte.config.js ./
COPY index.html ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
# Static files (optional, may be empty in development)
RUN mkdir -p ./static || true

# Build
RUN npm run build

# Runtime with Node adapter
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built app from builder
COPY --from=builder /app/dist ./build

EXPOSE 5174

ENV NODE_ENV=production

CMD ["node", "build/index.js"]
