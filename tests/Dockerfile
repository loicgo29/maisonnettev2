FROM node:20-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier tous les tests et .env
COPY tests/ ./tests/
COPY .env .env.example ./

# Runner par défaut
CMD ["npm", "run", "test:smoke"]
