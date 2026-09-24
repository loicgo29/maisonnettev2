# Comptabilité Module

Automated SASU accounting: Gmail invoice extraction → transaction matching → Sage sync.

## Quick Start

```bash
# Build (from parent maisonnettev2)
cd ../..
docker-compose up -d

# Access
http://localhost:8031/comptabilite
http://localhost:8031/api/comptabilite/matches/compute
```

## Development

Backend runs on port 3002, frontend on 8030 (via Caddy proxy).

## Credentials

Sage API credentials stored in Bitwarden (logo-prod/sasubilancomptable-sage).

Setup-env.sh pulls them automatically on deploy.
