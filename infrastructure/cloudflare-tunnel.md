# Cloudflare Tunnel Configuration

## Current Setup

**Tunnel Name:** `maisonnette-pecheur-bertheaume`  
**Tunnel ID:** `9fe4952e-7609-4c06-8069-dce5e16c7cad`

### Ingress Rules

| Hostname | Service |
|----------|---------|
| `maisonnette-pecheur-bertheaume.fr` | `http://localhost:8030` |
| `www.maisonnette-pecheur-bertheaume.fr` | `http://localhost:8030` |
| `*` | `http_status:404` |

## Starting the Tunnel

### Option 1: Manual Start
```bash
cloudflared tunnel run maisonnette-pecheur-bertheaume
```

### Option 2: With Config File
```bash
cat > ~/.cloudflared/config.yml <<'EOF'
tunnel: 9fe4952e-7609-4c06-8069-dce5e16c7cad
credentials-file: /Users/logo/.cloudflared/9fe4952e-7609-4c06-8069-dce5e16c7cad.json

ingress:
  - hostname: maisonnette-pecheur-bertheaume.fr
    service: http://localhost:8030
  - hostname: www.maisonnette-pecheur-bertheaume.fr
    service: http://localhost:8030
  - service: http_status:404
EOF

cloudflared tunnel run --config ~/.cloudflared/config.yml
```

### Option 3: Systemd Service (Recommended)
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## Verification

```bash
# Check if tunnel is running
cloudflared tunnel list

# View tunnel status
cloudflared tunnel info 9fe4952e-7609-4c06-8069-dce5e16c7cad

# Test production URL
curl -s https://maisonnette-pecheur-bertheaume.fr/ | head -20
```

## Troubleshooting

- **Status 000:** Tunnel not running or not connected
- **502 Bad Gateway:** Backend service not responding on localhost:8030
- **Connection refused:** Verify `localhost:8030` is accessible

## Infrastructure as Code

This configuration should be:
1. ✅ Documented (this file)
2. ⏳ Stored in git
3. ⏳ Tested via BDD suite
4. ⏳ Deployed via CI/CD (future)
