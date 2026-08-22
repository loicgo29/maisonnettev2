# Phase B.5 & D — Google Calendar + Observability + Backups

## Phase B.5 — Google Calendar Sync

### Setup

#### 1. Create Google Service Account

```bash
# Go to Google Cloud Console
# 1. Create project: "maisonnettev2"
# 2. Enable APIs:
#    - Google Calendar API
#    - Google People API
# 3. Create Service Account:
#    Service Accounts → Create Service Account
#    Name: maisonnettev2-calendar
# 4. Create key:
#    Service Account → Keys → Create new key → JSON
# 5. Download JSON and save to: backend/secrets/google-service-account.json
```

#### 2. Share Calendar with Service Account

```bash
# In Google Calendar:
# 1. Create calendar "maisonnettev2-reservations"
# 2. Get calendar ID (settings → Calendar address)
# 3. Share with service account email:
#    service-account@maisonnettev2.iam.gserviceaccount.com
# 4. Grant Editor permissions
# 5. Copy calendar ID to Gite.googleCalendarId
```

#### 3. Environment Configuration

```bash
# backend/.env
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json
```

### Usage

#### Check Available Slots

```typescript
import { getGoogleCalendarService } from '../services/googleCalendar';

const gcal = await getGoogleCalendarService();
const available = await gcal.getAvailableSlots(
  calendarId,
  new Date('2026-09-01'),
  new Date('2026-09-05')
);

if (available.available) {
  console.log('✅ Dates available');
} else {
  console.log('❌ Conflicts:', available.busySlots);
}
```

#### Create Reservation Event

```typescript
const eventId = await gcal.createReservationEvent(calendarId, {
  id: reservation.id,
  clientNom: 'John Doe',
  clientEmail: 'john@example.com',
  dateDebut: new Date('2026-09-01'),
  dateFin: new Date('2026-09-05'),
  giteName: 'Test Gite',
});

// Save event ID in database
await prisma.reservation.update({
  where: { id: reservation.id },
  data: { googleCalendarEventId: eventId },
});
```

#### Update/Cancel Reservation

```typescript
// On confirmation
await gcal.updateReservationEvent(calendarId, eventId, 'CONFIRMED');

// On cancellation
await gcal.deleteReservationEvent(calendarId, eventId);
```

#### Sync All Reservations

```typescript
// Periodic job (run hourly)
const { synced, failed } = await gcal.syncReservationsToCalendar();
console.log(`Synced: ${synced}, Failed: ${failed}`);
```

### Integration into Reservation Flow

```typescript
// In POST /api/reservations route:

1. Create reservation in DB (status: PENDING)
2. Check availability on Google Calendar
3. If no conflicts:
   - Create calendar event
   - Save googleCalendarEventId
4. Return reservation to client
5. Client pays via Stripe
6. On payment success:
   - Update status to CONFIRMED
   - Update calendar event status
```

---

## Phase D — Observability & Backups

### D.1 — Sentry Error Tracking

#### Setup

```bash
# 1. Create Sentry project
# Go to sentry.io → Create Organization → New Project

# 2. Configure backend
export SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
export SENTRY_ENVIRONMENT=production

# 3. Configure frontend
# frontend/.env.production
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

#### Initialize Sentry

```typescript
// backend/src/index.ts
import { initSentry, captureError } from './lib/monitoring';

initSentry();
// ... rest of app

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  captureError(err);
  process.exit(1);
});
```

#### Capture Errors

```typescript
import { captureError, captureEvent } from './lib/monitoring';

try {
  // risky operation
} catch (error) {
  captureError(error, {
    reservationId: reservation.id,
    giteId: gite.id,
    operation: 'createReservation',
  });
}
```

#### Track Business Events

```typescript
import { trackBusinessEvent } from './lib/monitoring';

trackBusinessEvent('reservation_created', {
  reservationId: reservation.id,
  giteId: gite.id,
  userId: user.sub,
  amount: reservation.montantTotal,
  status: 'PENDING',
});

trackBusinessEvent('payment_confirmed', {
  reservationId: reservation.id,
  amount: reservation.montantTotal,
  status: 'CONFIRMED',
});
```

### D.2 — Structured Logging (Pino)

#### Usage

```typescript
import { logger } from './lib/monitoring';

// Info level
logger.info({ userId: '123', action: 'login' }, 'User logged in');

// Warning level
logger.warn({ file: 'large.pdf', size: '500MB' }, 'Large file uploaded');

// Error level
logger.error({ err: error, reservationId: '456' }, 'Reservation creation failed');

// Debug level
logger.debug({ payload: data }, 'Request received');
```

#### Log Structure (Production JSON)

```json
{
  "level": 30,
  "time": "2026-08-22T15:30:00.000Z",
  "pid": 12345,
  "hostname": "vps-prod",
  "service": "maisonnettev2-api",
  "environment": "production",
  "version": "1.0.0",
  "msg": "User logged in",
  "userId": "123",
  "action": "login"
}
```

### D.3 — Database Backups

#### Automated Backup (Cron)

```bash
# SSH to VPS
ssh deploy@vps

# Add cron job
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * cd /home/deploy/maisonnettev2 && ./scripts/backup.sh prod >> /var/log/maisonnettev2-backup.log 2>&1
```

#### Manual Backup

```bash
# On VPS
cd /home/deploy/maisonnettev2

# Staging backup
./scripts/backup.sh staging

# Production backup
./scripts/backup.sh prod

# Check backups
ls -lh backups/maisonnettev2-*.sql.gz
```

#### Restore from Backup

```bash
# List available backups
ls -lh backups/

# Restore to staging
./scripts/restore.sh backups/maisonnettev2-staging-20260820-143000.sql.gz staging

# Restore to production (requires confirmation)
./scripts/restore.sh backups/maisonnettev2-prod-20260820-143000.sql.gz prod
```

### D.4 — Disaster Recovery

#### RTO/RPO Targets

- **RPO** (Recovery Point Objective): 24 hours
  - Daily backups at 2 AM
  - Acceptable data loss: up to 24 hours

- **RTO** (Recovery Time Objective): 2 hours
  - Backup restore script: ~30 minutes
  - Application restart: ~5 minutes
  - Manual validation: ~30 minutes

#### Backup Retention Policy

```bash
# Automatic cleanup (in backup.sh)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Manual retention
# Keep: 7 daily, 4 weekly, 3 monthly
```

#### Test Restores

**Monthly restore test (Staging):**

```bash
# 1st of each month, restore latest backup to staging
./scripts/restore.sh backups/maisonnettev2-staging-latest.sql.gz staging

# 2. Verify data integrity
docker-compose exec postgres-maisonnettev2 psql -U staging_user -c "
  SELECT 
    (SELECT count(*) FROM gite) as gites,
    (SELECT count(*) FROM reservation) as reservations,
    (SELECT count(*) FROM photo) as photos
"

# 3. Run health checks
curl https://api.staging.maisonnettev2.local/health

# 4. Document results in BACKUP_TESTS.md
```

#### Incident Response

**If production database corrupted:**

```bash
# 1. Assess damage
docker-compose exec postgres-maisonnettev2 psql -U prod_user -c "SELECT count(*) FROM reservation WHERE dateDebut > now() - interval '24h';"

# 2. Determine restore point (get last-known-good backup)
ls -lt backups/ | head -5

# 3. Restore from backup (with approval)
./scripts/restore.sh backups/maisonnettev2-prod-20260822-020000.sql.gz prod

# 4. Verify data
# Check key entities, recent transactions

# 5. Notify affected users
# Email users with reservations created after last backup

# 6. Post-incident review
# Update procedures, test backup process
```

---

## Integration Checklist

### Phase B.5 (Google Calendar)

- [ ] Service Account created + JSON key downloaded
- [ ] Google Calendar API enabled
- [ ] Service account email shared with calendar (Editor)
- [ ] Calendar ID added to Gite.googleCalendarId
- [ ] GOOGLE_SERVICE_ACCOUNT_KEY_PATH configured in .env
- [ ] getGoogleCalendarService() working
- [ ] Reservation routes integrated with Google Calendar
- [ ] Calendar events created on reservation confirm
- [ ] Calendar events deleted on reservation cancel
- [ ] Sync job added (hourly/daily)
- [ ] Tests written (mocked Google API)

### Phase D (Observability + Backups)

- [ ] Sentry project created + DSN configured
- [ ] Sentry initialized in backend
- [ ] Error capturing integrated into main routes
- [ ] Business events tracked (reservations, payments)
- [ ] Pino logger configured
- [ ] Structured logs emitted (JSON format)
- [ ] Logs sent to centralized log service (if applicable)
- [ ] Backup script created + tested
- [ ] Restore script created + tested
- [ ] Cron job configured for daily backups
- [ ] Backup retention policy set (7 days minimum)
- [ ] Monthly restore test scheduled
- [ ] RTO/RPO documented + communicated
- [ ] Incident response playbook created
- [ ] Team trained on restore procedures

---

## Monitoring Dashboard (Post-Implementation)

```
Sentry Dashboard:
  - Error rate (target < 0.1%)
  - Average response time
  - P95 latency
  - Top errors this week

Pino Logs (Logging Service):
  - Daily request volume
  - 4xx/5xx error ratio
  - Database query times
  - Calendar sync status

Backup Status:
  - Last successful backup: ✅ 2 hours ago
  - Backup size: 150 MB (gzip)
  - Storage used: 1 GB (7-day retention)
```

---

## Next Steps After B.5 + D

1. ✅ Phase B.5 — Google Calendar sync
2. ✅ Phase D — Observability + Backups
3. **Phase B.6** — Stripe payments (remaining)
4. **Phase B.7-B.8** — Final docs + hardening
5. Deploy to staging/production with monitoring active
