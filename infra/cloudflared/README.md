# Tunnel Cloudflare — maisonnette-pecheur-bertheaume.fr

Le tunnel `9fe4952e-7609-4c06-8069-dce5e16c7cad` expose Caddy (`localhost:8030`)
sur le domaine public.

## Configuration locale et non distante

Le service **doit** être lancé avec `--config`, jamais avec `--token`.

En mode `--token`, cloudflared lit sa configuration depuis le dashboard
Cloudflare Zero Trust et **ignore silencieusement** le `config.yml` local. Si
aucun hostname public n'est déclaré côté dashboard, le connecteur se connecte
normalement mais répond **503 à toutes les requêtes**, avec ce seul indice dans
`/Library/Logs/com.cloudflare.cloudflared.err.log` :

```
WRN No ingress rules were defined in provided config (if any) nor from the cli,
    cloudflared will return 503 for all incoming HTTP requests
```

C'est exactement ce qui s'est produit le 2026-08-28 : DNS, TLS et tunnel sains
(4 connexions HA, requêtes reçues, 0 erreur), Caddy répondant 200 en local, et
pourtant 503 en production.

## Fichier de référence

`config.yml` de ce dossier est la copie versionnée de
`~/.cloudflared/config.yml`, qui est le fichier réellement lu par le service.
Le service pointe volontairement sur `~/.cloudflared/` et non sur ce dépôt :
celui-ci vit sur un disque externe qui peut être démonté.

**Après toute modification ici, reporter dans `~/.cloudflared/config.yml`** puis
recharger le service (voir ci-dessous).

## Vérifications

```bash
# Valider les règles (le drapeau --config précède la sous-commande)
cloudflared --config ~/.cloudflared/config.yml tunnel ingress validate

# Vérifier quelle règle capte une URL donnée
cloudflared --config ~/.cloudflared/config.yml tunnel ingress rule \
  https://maisonnette-pecheur-bertheaume.fr/

# Le connecteur reçoit-il les requêtes ? (compteur doit augmenter)
curl -s http://127.0.0.1:20241/metrics | grep ^cloudflared_tunnel_total_requests
```

## Recharger le service

```bash
sudo launchctl unload /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo launchctl load  /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

## Diagnostic d'un 503 en production

1. `curl -sI https://maisonnette-pecheur-bertheaume.fr/` — un `server: cloudflare`
   sans en-tête d'origine indique que la réponse ne vient pas de Caddy.
2. Compteur `cloudflared_tunnel_total_requests` : s'il augmente, la requête
   atteint bien le connecteur et le problème est en aval (ingress ou origine).
3. `tail /Library/Logs/com.cloudflare.cloudflared.err.log` — le message y est
   explicite.
4. Origine directe : `curl -H "Host: maisonnette-pecheur-bertheaume.fr"
   http://127.0.0.1:8030/` doit répondre 200.
