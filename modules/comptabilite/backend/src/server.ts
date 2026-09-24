import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'node:os';
import 'dotenv/config';
import prisma from './db.js';

// Routes
import invoicesRouter from './routes/invoices.js';
import transactionsRouter from './routes/transactions.js';
import matchesRouter from './routes/matches.js';
import syncRouter from './routes/sync.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.text()); // For CSV/OFX uploads

/**
 * Identity of the database target, without leaking credentials.
 * `postgres` only resolves inside Docker; `localhost` only outside it.
 * Seeing the wrong one here is the fastest way to spot a misrouted server.
 */
function dbTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'unset';
  try {
    const { hostname, port } = new URL(url);
    return `${hostname}:${port || '5432'}`;
  } catch {
    return 'invalid';
  }
}

/**
 * Health check that identifies *which* server is answering.
 * A stale host-side `npm run dev` and a fresh container both answer on the
 * same port; `mode`, `hostname` and `commit` are what tell them apart.
 */
app.get('/health', async (req, res) => {
  let db = 'down';
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'up';
  } catch (e: any) {
    dbError = e.message?.split('\n').filter(Boolean).pop();
  }

  res.status(db === 'up' ? 200 : 503).json({
    status: db === 'up' ? 'healthy' : 'degraded',
    mode: process.env.RUNTIME_MODE ?? 'local',
    hostname: os.hostname(),
    commit: process.env.GIT_SHA ?? 'dev',
    db,
    dbTarget: dbTarget(),
    ...(dbError ? { dbError } : {}),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Which integrations are actually usable right now.
 * The UI reads this to disable what cannot work, instead of offering a button
 * whose only possible outcome is an error message.
 */
app.get('/api/config', (req, res) => {
  const isSet = (v?: string) => Boolean(v && v !== 'not-set');
  res.json({
    gmail:
      isSet(process.env.GMAIL_CLIENT_ID) &&
      isSet(process.env.GMAIL_CLIENT_SECRET) &&
      isSet(process.env.GMAIL_REFRESH_TOKEN),
    pennylane: isSet(process.env.PENNYLANE_API_KEY),
  });
});

// API Routes
app.use('/api/invoices', invoicesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/sync', syncRouter);

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SASU Backend API',
    version: '0.1.0',
    endpoints: {
      invoices: '/api/invoices',
      transactions: '/api/transactions',
      matches: '/api/matches',
      sync: '/api/sync',
      health: '/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ SASU Backend running on http://localhost:${PORT}`);
  console.log(`   mode=${process.env.RUNTIME_MODE ?? 'local'} host=${os.hostname()} commit=${process.env.GIT_SHA ?? 'dev'}`);
  console.log(`   db=${dbTarget()}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});
