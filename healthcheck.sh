#!/bin/bash

# Health Check Script — Maisonnettev2 Production
# Run via cron: */5 * * * * /opt/maisonnettev2/healthcheck.sh >> /var/log/healthcheck.log 2>&1

set -e

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/healthcheck.log"
STATUS_OK=0
STATUS_CRITICAL=1

# Configuration
DOMAINS=("maisonnette.fr" "backoffice.maisonnette.fr")
API_URL="https://backoffice.maisonnette.fr/api/health"
TIMEOUT=5

# Color codes (for terminal output)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================================================
# Functions
# ========================================================================

log() {
  echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

check_https() {
  local domain=$1
  if curl -sf --connect-timeout $TIMEOUT https://"$domain" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $domain"
    return 0
  else
    echo -e "${RED}✗${NC} $domain"
    return 1
  fi
}

check_login_page() {
  local domain=$1
  if curl -sf --connect-timeout $TIMEOUT "https://$domain/backoffice/login" | grep -q "username" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Login page loads"
    return 0
  else
    echo -e "${RED}✗${NC} Login page missing"
    return 1
  fi
}

check_api_protected() {
  # Should return 401 without token
  local response=$(curl -s --connect-timeout $TIMEOUT \
    -w "%{http_code}" \
    -o /dev/null \
    "https://backoffice.maisonnette.fr/api/backoffice/meals/accounts")

  if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo -e "${GREEN}✓${NC} API protected (HTTP $response)"
    return 0
  else
    echo -e "${RED}✗${NC} API not protected (HTTP $response)"
    return 1
  fi
}

check_ssl_certificate() {
  local domain=$1
  local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
    openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  if [ -z "$expiry_date" ]; then
    echo -e "${RED}✗${NC} SSL certificate check failed"
    return 1
  fi

  local expiry_epoch=$(date -d "$expiry_date" +%s)
  local now_epoch=$(date +%s)
  local days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

  if [ $days_left -lt 7 ]; then
    echo -e "${YELLOW}⚠${NC} SSL cert expires in $days_left days"
    return 1
  else
    echo -e "${GREEN}✓${NC} SSL cert valid ($days_left days)"
    return 0
  fi
}

check_docker_containers() {
  # Check if main containers are running
  local running=$(docker compose -f docker-compose.prod.yml ps --quiet | wc -l)
  local expected=5  # postgres, backend, backoffice, public, caddy

  if [ "$running" -ge "$expected" ]; then
    echo -e "${GREEN}✓${NC} Docker containers running ($running)"
    return 0
  else
    echo -e "${RED}✗${NC} Only $running/$expected containers running"
    return 1
  fi
}

check_disk_space() {
  # Alert if disk usage > 80%
  local disk_usage=$(df /opt | tail -1 | awk '{print $5}' | cut -d% -f1)

  if [ "$disk_usage" -gt 80 ]; then
    echo -e "${RED}✗${NC} Disk usage critical ($disk_usage%)"
    return 1
  elif [ "$disk_usage" -gt 70 ]; then
    echo -e "${YELLOW}⚠${NC} Disk usage high ($disk_usage%)"
    return 1
  else
    echo -e "${GREEN}✓${NC} Disk usage normal ($disk_usage%)"
    return 0
  fi
}

check_backup() {
  # Verify backup file created in last 26 hours
  local backup_dir="/opt/maisonnettev2/backups"

  if [ ! -d "$backup_dir" ]; then
    echo -e "${YELLOW}⚠${NC} Backup directory not found"
    return 1
  fi

  local latest_backup=$(ls -t "$backup_dir"/db-*.sql.gz 2>/dev/null | head -1)

  if [ -z "$latest_backup" ]; then
    echo -e "${RED}✗${NC} No backup files found"
    return 1
  fi

  local backup_age=$(($(date +%s) - $(stat -f%m "$latest_backup" 2>/dev/null || stat -c%Y "$latest_backup")))
  local hours_since=$((backup_age / 3600))

  if [ $hours_since -gt 26 ]; then
    echo -e "${RED}✗${NC} Backup too old ($hours_since hours)"
    return 1
  else
    echo -e "${GREEN}✓${NC} Backup recent ($hours_since hours)"
    return 0
  fi
}

send_alert() {
  local message=$1
  log "🚨 ALERT: $message"

  # TODO: Integrate with your alert system (email, Slack, etc)
  # Example: Send to Slack webhook
  # curl -X POST "$SLACK_WEBHOOK" -d "{\"text\": \"$message\"}"
}

# ========================================================================
# Main Health Check
# ========================================================================

log "================================"
log "Starting health check..."
log "================================"

FAILURES=0

# Check HTTPS on all domains
log ""
log "📍 Checking HTTPS endpoints..."
for domain in "${DOMAINS[@]}"; do
  if ! check_https "$domain"; then
    ((FAILURES++))
  fi
done

# Check login page
if ! check_login_page "backoffice.maisonnette.fr"; then
  ((FAILURES++))
fi

# Check API protection
if ! check_api_protected; then
  ((FAILURES++))
fi

# Check SSL certificates (for primary domain)
log ""
log "🔒 Checking SSL certificates..."
for domain in "${DOMAINS[@]}"; do
  if ! check_ssl_certificate "$domain"; then
    ((FAILURES++))
  fi
done

# Check Docker containers
log ""
log "🐳 Checking Docker containers..."
if ! check_docker_containers; then
  ((FAILURES++))
fi

# Check disk space
log ""
log "💾 Checking disk space..."
if ! check_disk_space; then
  ((FAILURES++))
fi

# Check backups
log ""
log "💾 Checking backups..."
if ! check_backup; then
  ((FAILURES++))
fi

# Summary
log ""
log "================================"
if [ $FAILURES -eq 0 ]; then
  log "✅ All checks passed!"
  log "================================"
  exit $STATUS_OK
else
  log "❌ $FAILURES check(s) failed!"
  log "================================"
  send_alert "Maisonnettev2 health check failed: $FAILURES issue(s)"
  exit $STATUS_CRITICAL
fi
