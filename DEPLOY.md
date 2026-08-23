# Déploiement — maisonnette-pecheur-bertheaume.fr

## Adresses

| | |
|---|---|
| Site public | `https://maisonnette-pecheur-bertheaume.fr` |
| Ingress du tunnel Cloudflare | `http://localhost:8030` |
| Hôte | Mac Mini |

Le site est **public**, et pour cette raison volontairement **isolé** de
l'écosystème NAS privé : réseau Docker dédié (`maisonnette`), sans jonction
avec `nas-network` que partagent l'IDP, Immich et Paperless.

## Chemin du trafic

```
Visiteur
  → Cloudflare (termine le TLS)
  → tunnel sortant
  → cloudflared (natif sur le Mac Mini)
  → 127.0.0.1:8030
  → conteneur caddy  ── /api/*     → backend:3001
                      ├─ /uploads/* → backend:3001
                      └─ /*         → frontend:3000 (SvelteKit, adapter-node)
```

Aucun port n'est ouvert sur la box : `cloudflared` établit une connexion
sortante. Caddy est publié sur `127.0.0.1` uniquement — inaccessible depuis le
réseau local comme depuis Internet.

En développement, l'aiguillage `/api` est assuré par le proxy Vite. Vite
n'existe pas en production : ce rôle revient à Caddy.

## Première mise en service

```bash
cd /chemin/vers/maisonnettev2
cp .env.example .env
# Renseigner DB_PASSWORD (ex. openssl rand -base64 32)

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

Vérifier avant de brancher le tunnel :

```bash
curl -I http://localhost:8030/            # page du gîte
curl -s http://localhost:8030/api/gites   # API via Caddy
```

Puis, dans Cloudflare Zero Trust (Networks → Tunnels → ingress) :

| Hostname | Service |
|---|---|
| `maisonnette-pecheur-bertheaume.fr` | `http://localhost:8030` |
| `www.maisonnette-pecheur-bertheaume.fr` | `http://localhost:8030` |

## Mise à jour

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Exploitation

```bash
docker compose -f docker-compose.prod.yml ps          # état et santé
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f backend
```

Sauvegarde de la base et des photos :

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U maisonnette maisonnettev2 > sauvegarde-$(date +%F).sql

docker run --rm \
  -v maisonnettev2_uploads_data:/data \
  -v "$PWD":/backup alpine \
  tar czf /backup/photos-$(date +%F).tar.gz -C /data .
```

Les photos vivent dans le volume `uploads_data`, pas dans l'image : elles
survivent aux reconstructions.

## Intégration continue

Le workflow GitHub Actions vérifie, à chaque push, que le frontend et le
backend compilent et que les deux images Docker se construisent.

**Le déploiement n'est pas automatisé.** GitHub Actions ne peut pas joindre le
Mac Mini : il n'a pas d'IP publique, l'entrée se fait par un tunnel sortant.
La mise en production est la commande manuelle ci-dessus, depuis la machine ou
via Tailscale.

## Choix de ports

L'écosystème réserve la plage `80xx` aux applications derrière un proxy
(`8020` nas-logo-api, `8021`/`8022` alo). `8030` a été retenu pour ce site,
libre au moment de la mise en place.
