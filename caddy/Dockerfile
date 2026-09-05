# La configuration est embarquée dans l'image plutôt que montée depuis l'hôte.
#
# Le projet vit sur un disque externe partagé avec la VM Docker : un bind-mount
# de fichier y est fragile (si la propagation tarde, Docker crée un répertoire
# à la place et le conteneur refuse de démarrer). Embarquer la config rend le
# déploiement reproductible et supprime cette dépendance.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
