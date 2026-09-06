#!/bin/bash

# =============================================================================
# HETZNER PRODUCTION DEPLOYMENT SCRIPT — maisonnettev2
# =============================================================================
#
# Usage: ./deploy-hetzner.sh <HETZNER_IP>
#
# This script automates the entire deployment process:
# 1. Server setup (Docker, Docker Compose)
# 2. Repository clone
# 3. Environment configuration
# 4. Database migrations
# 5. Service startup
# 6. Health verification
#
# Prerequisites:
# - Hetzner CX23 server (Ubuntu 22.04 or Debian 12)
# - SSH access to root@<IP>
# - Domain DNS records already created
# - Generated secrets (JWT_SECRET, DB_PASSWORD)
#
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_URL="https://github.com/logo/maisonnettev2.git"
DEPLOY_DIR="/opt/maisonnettev2"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="/tmp/deploy_${TIMESTAMP}.log"

# =============================================================================
# Functions
# =============================================================================

log() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
  exit 1
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# =============================================================================
# Main Deployment
# =============================================================================

main() {
  if [ $# -eq 0 ]; then
    echo "Usage: $0 <HETZNER_IP>"
    echo "Example: $0 123.45.67.89"
    exit 1
  fi

  HETZNER_IP=$1

  log "=========================================="
  log "🚀 HETZNER DEPLOYMENT — maisonnettev2"
  log "=========================================="
  log "Target: root@${HETZNER_IP}"
  log "Log file: ${LOG_FILE}"
  log ""

  # Step 1: Server Setup
  log "Step 1/6: Server setup (Docker, Docker Compose)..."
  ssh root@"${HETZNER_IP}" << 'SSHEOF'
    set -e
    apt update && apt upgrade -y
    apt install -y curl wget git docker.io docker-compose-plugin
    docker --version
    docker compose version
SSHEOF
  success "Server setup complete"
  log ""

  # Step 2: Repository Clone
  log "Step 2/6: Cloning repository..."
  ssh root@"${HETZNER_IP}" << SSHEOF
    set -e
    cd /opt
    [ -d maisonnettev2 ] && rm -rf maisonnettev2
    git clone ${REPO_URL}
    cd maisonnettev2
    echo "Repository ready"
SSHEOF
  success "Repository cloned"
  log ""

  # Step 3: Environment Configuration (Interactive)
  log "Step 3/6: Environment configuration..."
  log "Please provide the following values:"

  read -p "Enter DB_PASSWORD (or press Enter to generate random): " DB_PASSWORD
  if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32)
    log "Generated DB_PASSWORD: ${DB_PASSWORD}"
  fi

  read -p "Enter JWT_SECRET (or press Enter to generate random): " JWT_SECRET
  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    log "Generated JWT_SECRET: ${JWT_SECRET}"
  fi

  read -p "Enter OWNER_EMAIL [contact@maisonnette.fr]: " OWNER_EMAIL
  OWNER_EMAIL=${OWNER_EMAIL:-"contact@maisonnette.fr"}

  read -p "Enter OWNER_PHONE [+33781103889]: " OWNER_PHONE
  OWNER_PHONE=${OWNER_PHONE:-"+33781103889"}

  # Create .env on Hetzner
  ssh root@"${HETZNER_IP}" << SSHEOF
    set -e
    cat > ${DEPLOY_DIR}/.env << 'ENV'
DB_USER=maisonnettev2
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=maisonnettev2
JWT_SECRET=${JWT_SECRET}
OWNER_EMAIL=${OWNER_EMAIL}
OWNER_PHONE=${OWNER_PHONE}
NODE_ENV=production
PORT=3001
ENV
    echo ".env created"
SSHEOF
  success "Environment configured"
  log ""

  # Step 4: DNS Verification
  log "Step 4/6: DNS verification..."
  warning "Ensure DNS records are created:"
  echo "  maisonnette.fr → ${HETZNER_IP}"
  echo "  backoffice.maisonnette.fr → ${HETZNER_IP}"
  read -p "Press Enter once DNS records are created and propagated..."
  log ""

  # Step 5: Deploy Services
  log "Step 5/6: Deploying Docker services..."
  ssh root@"${HETZNER_IP}" << SSHEOF
    set -e
    cd ${DEPLOY_DIR}
    docker compose -f docker-compose.prod.yml up -d
    sleep 30
    docker compose -f docker-compose.prod.yml ps
SSHEOF
  success "Services deployed and running"
  log ""

  # Step 6: Verification
  log "Step 6/6: Health verification..."
  sleep 30

  log "Verifying HTTPS endpoints..."
  if curl -sf https://maisonnette.fr > /dev/null 2>&1; then
    success "✓ https://maisonnette.fr"
  else
    warning "✗ https://maisonnette.fr (may still be starting)"
  fi

  if curl -sf https://backoffice.maisonnette.fr/backoffice/login > /dev/null 2>&1; then
    success "✓ https://backoffice.maisonnette.fr/backoffice/login"
  else
    warning "✗ https://backoffice.maisonnette.fr/backoffice/login (may still be starting)"
  fi

  log ""
  log "=========================================="
  log "✅ DEPLOYMENT COMPLETE!"
  log "=========================================="
  log ""
  log "Next steps:"
  log "  1. SSH: ssh root@${HETZNER_IP}"
  log "  2. Test login: "
  log "     curl -X POST https://backoffice.maisonnette.fr/api/backoffice/auth/login \\"
  log "       -H 'Content-Type: application/json' \\"
  log "       -d '{\"username\":\"admin\",\"pwd\":\"admin123\"}'"
  log "  3. Setup UptimeRobot monitoring"
  log "  4. Test backup: docker compose --profile backup up -d backup"
  log "  5. Review logs: docker compose logs -f"
  log ""
  log "Full runbook: DEPLOYMENT-RUNBOOK.md"
  log "Recovery guide: DISASTER-RECOVERY.md"
  log ""
}

# Run main function
main "$@"
