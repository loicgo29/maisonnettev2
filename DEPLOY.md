# Déploiement — maisonnette-pecheur-bertheaume.fr

## Adresses

| | |
|---|---|
| Site public | `https://maisonnette-pecheur-bertheaume.fr` |
| Serveur | Hetzner CX23, `23.88.35.119` |
| Accès | `ssh -i ~/.ssh/maisonnettev2_hetzner deploy@23.88.35.119` |
| Répertoire | `/opt/maisonnettev2` (pas un dépôt git — voir plus bas) |

Ancien hébergement : Mac Mini derrière un tunnel Cloudflare sortant. La bascule
vers Hetzner est documentée dans `infra/DEPLOIEMENT-HETZNER.md` (provisioning
Terraform, coupure DNS, retour arrière) — ce fichier-ci ne couvre que les mises
à jour d'une prod Hetzner déjà en place.

## Chemin du trafic

```
Visiteur
  → Caddy (termine le TLS lui-même, Let's Encrypt)
  → conteneur caddy  ── /api/*     → backend:3001
                      ├─ /uploads/* → backend:3001
                      └─ /*         → frontend:3000 (SvelteKit, adapter-node)
```

Caddy publie directement 80/443 sur l'IP publique du serveur — plus de tunnel
Cloudflare ni de `cloudflared`. Le backend (3001) et Postgres (5432) ne sont
pas publiés sur l'hôte : seul Caddy est joignable depuis l'extérieur.

## Le serveur n'est PAS un dépôt git

`/opt/maisonnettev2` est une copie de fichiers, synchronisée par `rsync` —
`git pull` n'y fonctionne pas. Toute mise à jour de code passe par un envoi
explicite depuis le poste de dev :

```bash
rsync -az --exclude node_modules --exclude .git --exclude dist \
  /Volumes/logousb/SSD/Projects/maisonnettev2/ deploy@23.88.35.119:/opt/maisonnettev2/
```

`.env` n'est **jamais** inclus dans ce rsync (il est gitignored et absent du
dépôt local) : il vit uniquement sur le serveur, édité sur place ou envoyé à
la main avec `scp` depuis une génération locale via `setup-env.sh` (voir
`infra/DEPLOIEMENT-HETZNER.md`, étape 5, pour l'adapter aux valeurs de prod).

## Mise à jour

```bash
ssh -i ~/.ssh/maisonnettev2_hetzner deploy@23.88.35.119
cd /opt/maisonnettev2
./deploy.sh
```

`deploy.sh` est idempotent : reconstruit les images, attend la base,
resynchronise les photos vers le volume, applique les migrations Prisma, seed,
puis vérifie de bout en bout (page d'accueil, API, photo servie). Il inclut
déjà la surcharge Hetzner (`docker-compose.hetzner.yml` : Caddy sur 80/443,
volumes sur `/donnees`, port 3001 non publié) — ne pas lancer
`docker compose -f docker-compose.prod.yml` seul, ça republierait le port 3001
et perdrait le montage `/donnees`.

Pour ne reconstruire qu'un seul service (plus rapide, ex. après un fix
backend uniquement) :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml \
  up -d --build backend
```

## Keycloak

Service séparé, à part des deux fichiers ci-dessus — voir
`docker-compose.keycloak.yml` et son en-tête pour le pourquoi (JVM, swap
dédié). Démarrage complet :

```bash
docker compose -f docker-compose.prod.yml \
               -f docker-compose.hetzner.yml \
               -f docker-compose.keycloak.yml up -d
```

`KEYCLOAK_REALM_URL` dans `.env` doit pointer sur le realm (avec ou sans le
suffixe `protocol/openid-connect/`, les deux formes sont acceptées — voir le
commentaire dans `backend/src/middleware/oidc.ts`). Une URL JWKS mal résolue
ne fait planter ni Keycloak ni le backend : elle fait simplement rejeter
**tout** jeton, valide compris, en 401 — sans le moindre message d'erreur
explicite côté client. `scripts/test-jwks.sh` vérifie ce point précis sans
navigateur.

## Exploitation

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml ps
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml logs -f caddy
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml logs -f backend
```

Sauvegarde de la base et des photos :

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml exec postgres \
  pg_dump -U maisonnette maisonnettev2 > sauvegarde-$(date +%F).sql

docker run --rm \
  -v maisonnettev2_uploads_data:/data \
  -v "$PWD":/backup alpine \
  tar czf /backup/photos-$(date +%F).tar.gz -C /data .
```

Les photos et les données Postgres vivent sur `/donnees` (volume Hetzner
persistant), pas dans les images ni dans des volumes Docker anonymes : elles
survivent à la destruction et à la recréation du serveur (voir
`infra/DEPLOIEMENT-HETZNER.md`, section « Points de vigilance »).

## Intégration continue

Le workflow GitHub Actions vérifie, à chaque push, que le frontend et le
backend compilent, exécute la suite BDD contre un Keycloak de test éphémère
(voir `infra/keycloak/realm-test.json`), et construit + pousse les deux
images vers `ghcr.io`.

**Le déploiement n'est pas automatisé.** GitHub Actions ne peut pas rsync ni
SSH vers le serveur automatiquement (pas d'action configurée pour ça — les
images poussées sur `ghcr.io` ne sont d'ailleurs pas celles que `deploy.sh`
utilise, qui reconstruit localement sur le serveur). La mise en production
reste la commande manuelle ci-dessus.

Un job manuel séparé (`smoke-test-prod`, `workflow_dispatch` uniquement)
vérifie le flux OAuth2 complet contre la vraie prod après un déploiement,
avec le compte technique `ci-tests` (rôle `admin`, realm `maisonnettev2`) —
jamais lancé automatiquement sur push, pour ne pas solliciter la protection
anti brute-force du Keycloak public à chaque commit.

## Choix de ports

L'écosystème réserve la plage `80xx` aux applications derrière un proxy
(`8020` nas-logo-api, `8021`/`8022` alo) sur le Mac mini. Sans objet sur ce
serveur Hetzner, dédié à ce seul site : Caddy y occupe directement 80/443.
