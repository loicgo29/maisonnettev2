import * as Sentry from '@sentry/node';
import pino from 'pino';

// Initialize Sentry
export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      beforeSend(event, hint) {
        // Filter out noisy errors
        if (hint.originalException instanceof SyntaxError) {
          return null;
        }
        return event;
      },
    });

    console.log('[Sentry] Initialized with DSN:', process.env.SENTRY_DSN);
  } else {
    console.log('[Sentry] Disabled (SENTRY_DSN not configured)');
  }
}

// Structured logger (Pino)
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    base: {
      service: 'maisonnettev2-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.0.0',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isProduction ? pino.transport({ target: 'pino/file' }) : pino.transport({ target: 'pino-pretty' })
);

// Capture errors in Sentry + structured log
export function captureError(error: Error | unknown, context?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error));

  // Log structurally
  logger.error(
    {
      err,
      context,
      timestamp: new Date().toISOString(),
    },
    err.message
  );

  // Send to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { contexts: { custom: context } });
  }
}

// Capture important events
export function captureEvent(
  event: string,
  level: 'info' | 'warn' | 'error' = 'info',
  data?: Record<string, any>
) {
  if (level === 'error') {
    logger.error(data, event);
  } else if (level === 'warn') {
    logger.warn(data, event);
  } else {
    logger.info(data, event);
  }

  if (process.env.SENTRY_DSN && level !== 'info') {
    Sentry.captureMessage(event, level === 'error' ? 'error' : 'warning');
  }
}

// Track API request/response
export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  error?: string;
}

export function logRequest(metrics: RequestMetrics) {
  const level = metrics.statusCode >= 400 ? 'warn' : 'info';

  logger[level](
    {
      method: metrics.method,
      path: metrics.path,
      statusCode: metrics.statusCode,
      durationMs: metrics.duration,
      userId: metrics.userId,
      error: metrics.error,
    },
    `${metrics.method} ${metrics.path} ${metrics.statusCode}`
  );
}

// Track business events (reservations, payments, etc.)
export function trackBusinessEvent(
  event: string,
  data: {
    userId?: string;
    reservationId?: string;
    giteId?: string;
    amount?: number;
    status?: string;
  }
) {
  logger.info(data, event);

  // Send to Sentry for monitoring
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(event, 'info');
  }
}

export default { logger, captureError, captureEvent, logRequest, trackBusinessEvent };
