# Déploiement sur Hetzner — procédure

Cible : `maisonnette-pecheur-bertheaume.fr` servi depuis un serveur Hetzner CPX11,
en remplacement de l'hébergement actuel (Mac mini + tunnel Cloudflare).

**Périmètre :** maisonnettev2 uniquement. alo reste sur le Mac mini derrière
Tailscale — c'est un outil personnel, sans intérêt à être exposé.

**Coût :** ~5,30 €/mois — CPX11 4,35 € + IPv4 0,50 € + volume 10 Go 0,44 €.
PostgreSQL tourne en conteneur, pas en base managée : le volume de données est
minuscule (577 dépenses, 1 gîte) et la sauvegarde avec garde-fou existe déjà.

---

## Étape 1 — Compte Hetzner et jeton API

1. Créer un compte sur https://console.hetzner.cloud
2. Créer un projet, puis **Security → API Tokens → Generate**, permission **Read & Write**
3. Ranger le jeton dans Bitwarden : élément **`hetzner`**, note `api_token = …`

Le jeton ne doit jamais atterrir dans un fichier du dépôt ni dans une
conversation : il permet de créer et détruire des serveurs.

## Étape 2 — Clé SSH

Réutiliser une clé existante ou en créer une dédiée :

```bash
ssh-keygen -t ed25519 -C "maisonnettev2-hetzner" -f ~/.ssh/maisonnettev2_hetzner
```

## Étape 3 — Provisionner

```bash
cd maisonnettev2/infra/terraform

export TF_VAR_hcloud_token=$(
  BW_SESSION=$(/Volumes/logousb/SSD/Projects/bw-session.sh --raw) \
  bw get item hetzner --session "$BW_SESSION" \
    | jq -r '.notes' | grep -E '^\s*api_token\s*=' | sed -E 's/^\s*[^=]*=\s*//'
)
export TF_VAR_cle_ssh_publique="$(cat ~/.ssh/maisonnettev2_hetzner.pub)"

terraform init
terraform plan      # LIRE le plan avant d'appliquer
terraform apply
```

`terraform output` donne l'IPv4, la commande SSH et les enregistrements DNS à créer.

## Étape 4 — DNS

⚠️ **Retirer d'abord l'ingress du tunnel Cloudflare** pour ce domaine dans
`~/.cloudflared/config.yml`, sinon le tunnel et le serveur se disputent le
trafic. Recharger ensuite le service.

Puis chez Cloudflare, pour `maisonnette-pecheur-bertheaume.fr` :

| Type | Nom | Valeur | Proxy |
|------|-----|--------|-------|
| A | `@` | IPv4 du serveur | **DNS only** au début |
| A | `www` | IPv4 du serveur | **DNS only** au début |
| AAAA | `@` | IPv6 du serveur | **DNS only** au début |

Le mode « DNS only » (nuage gris) est indispensable au premier démarrage :
Caddy valide son certificat Let's Encrypt en HTTP-01, ce que le proxy
Cloudflare intercepterait. Le proxy pourra être réactivé une fois le
certificat obtenu.

Attendre la propagation avant l'étape suivante :
```bash
dig +short maisonnette-pecheur-bertheaume.fr
```

## Étape 5 — Déployer l'application

```bash
IP=$(terraform output -raw ipv4)

# Code source
rsync -az --exclude node_modules --exclude .git --exclude dist \
  /Volumes/logousb/SSD/Projects/maisonnettev2/ deploy@$IP:/opt/maisonnettev2/

# Environnement : généré en local depuis Bitwarden, jamais sur le serveur.
# Le mot de passe maître ne doit jamais atteindre une machine publique.
cd /Volumes/logousb/SSD/Projects && ./setup-env.sh
scp maisonnettev2/.env deploy@$IP:/opt/maisonnettev2/.env
ssh deploy@$IP 'chmod 600 /opt/maisonnettev2/.env'
```

⚠️ **Adapter le `.env` avant de l'envoyer** — `setup-env.sh` écrit des valeurs
de développement :

| Variable | Développement | Production |
|----------|---------------|------------|
| `DB_PASSWORD` | `dev_password_change_me` | mot de passe fort, depuis Bitwarden |
| `DOMAIN` | `localhost` | `maisonnette-pecheur-bertheaume.fr` |
| `PUBLIC_ORIGIN` | `http://localhost:8030` | `https://maisonnette-pecheur-bertheaume.fr` |
| `NODE_ENV` | `development` | `production` |
| `ACME_EMAIL` | absent | adresse valide pour Let's Encrypt |

Puis démarrer :

```bash
ssh deploy@$IP
cd /opt/maisonnettev2
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml up -d --build
docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml logs -f caddy
```

Les migrations Prisma s'appliquent automatiquement au démarrage du backend
(`docker-entrypoint.sh`) : la base vierge se crée seule.

## Étape 6 — Vérifier

```bash
curl -sI https://maisonnette-pecheur-bertheaume.fr/ | head -3   # 200, HTTP/2
curl -s  https://maisonnette-pecheur-bertheaume.fr/api/gites | jq 'length'
curl -sI http://maisonnette-pecheur-bertheaume.fr/ | grep -i location  # redirection 308 vers HTTPS

# Rien d'autre ne doit être joignable
nc -zv IP 5432   # doit échouer : PostgreSQL n'est pas exposé
nc -zv IP 3001   # doit échouer : le backend non plus
```

Suite BDD depuis le poste local :
```bash
cd /Volumes/logousb/SSD/Projects/maisonnettev2 && npm run test:bdd
```
Les scénarios `production-availability` et `cloudflare-tunnel` visent le
domaine public : ils passeront au vert une fois le site en ligne.

## Étape 7 — Sauvegardes

Adapter `backup-alo-volume.sh` pour PostgreSQL distant, ou ajouter sur le
serveur un `pg_dump` quotidien vers `/donnees/sauvegardes`, rapatrié ensuite.
Conserver le garde-fou anti-régression : **refuser d'écraser une sauvegarde si
le nombre de lignes diminue.**

---

## Retour arrière

Le Mac mini reste opérationnel pendant toute la bascule. En cas de problème :

1. Remettre l'ingress dans `~/.cloudflared/config.yml` et recharger le service
2. Repasser les DNS sur le CNAME du tunnel
3. Diagnostiquer sans pression

Ne détruire le serveur qu'après plusieurs jours de fonctionnement confirmé :
`terraform destroy` — le volume a `delete_protection = true` et devra être
libéré explicitement.

---

## Points de vigilance

- **Quota Let's Encrypt** : 5 certificats par domaine et par semaine. En cas de
  mise au point répétée, décommenter `acme_ca` (staging) dans
  `caddy/Caddyfile.hetzner`.
- **Compose additionne les listes** des fichiers de surcharge. `docker-compose.hetzner.yml`
  utilise `!override` et `!reset` : sans eux, le `127.0.0.1:8030` du Mac mini et
  le port 3001 du backend resteraient publiés. Vérifier après toute
  modification :
  ```bash
  docker compose -f docker-compose.prod.yml -f docker-compose.hetzner.yml config | grep published
  ```
  Seuls 80 et 443 doivent apparaître.
- **SSH ouvert au monde** par défaut (`ips_ssh_autorisees`). À resserrer sur ton
  IP de sortie une fois celle-ci stable.
- **Le volume survit au serveur** : `terraform destroy` puis `apply` recrée la
  machine sans perdre la base. cloud-init ne formate que si le volume est
  vierge.
