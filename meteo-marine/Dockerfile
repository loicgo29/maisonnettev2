FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

# Boucle plutôt qu'un vrai daemon cron : c'est déjà le patron du service
# `backup` de docker-compose.prod.yml, pas besoin d'un second mécanisme pour
# une seule tâche périodique. Un échec (API tierce en panne) ne tue pas la
# boucle : publish.ts n'écrit rien dans ce cas, la page publiée reste
# inchangée jusqu'au prochain passage.
CMD ["sh", "-c", "while true; do npm run publish:docker; echo 'Prochaine publication dans 1h...'; sleep 3600; done"]
