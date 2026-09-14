FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Servi sous /admin/alo (Caddy strip le préfixe) plutôt qu'un sous-domaine
# dédié depuis le 2026-09-14 : l'app doit donc appeler son API sous ce
# même préfixe, pas /api à la racine, qui entrerait en collision avec
# l'API de maisonnettev2.
ARG REACT_APP_API_URL=/admin/alo/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1
