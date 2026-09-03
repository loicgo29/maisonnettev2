import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRouter from '../../src/routes/health';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/', healthRouter);
  });

  describe('GET /health', () => {
    // Expectations follow the contract the route actually serves: 'healthy' /
    // 'unhealthy', with connectivity reported under checks.database. The former
    // 'ok' / 'error' shape predates the current implementation.
    it('should return 200 with status healthy when database is reachable', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ok: 1 }]);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        checks: expect.objectContaining({ database: 'connected' }),
      });
    });

    it('should return 503 when database connection fails', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('disconnected');
    });
  });

  describe('GET /live', () => {
    it('should return 200 immediately without database checks', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
    });
  });

  describe('GET /ready', () => {
    it('should return 200 when ready to serve traffic', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ok: 1 }]);

      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });

    it('should return 503 when not ready', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Not ready'));

      const response = await request(app).get('/ready');

      expect(response.status).toBe(503);
    });
  });
});
