import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import gitesRouter from '../../src/routes/gites';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    gite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

let authConfiguredToReject = false;

vi.mock('../../src/middleware/oidc.js', () => ({
  verifyOIDCToken: (req: any, res: any, next: any) => {
    if (authConfiguredToReject) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { sub: 'user-123', email: 'test@example.com' };
    next();
  },
}));

const createAuthenticatedApp = () => {
  authConfiguredToReject = false;
  const app = express();
  app.use(express.json());
  app.use('/', gitesRouter);
  return app;
};

const createUnauthenticatedApp = () => {
  authConfiguredToReject = true;
  const app = express();
  app.use(express.json());
  app.use('/', gitesRouter);
  return app;
};

describe('Gites Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createAuthenticatedApp();
  });

  describe('GET /api/gites', () => {
    it('should return list of gites', async () => {
      const mockGites = [
        {
          id: '1',
          slug: 'gite-1',
          nom: 'Gîte 1',
          description: 'Description 1',
          adresse: '123 Rue de Paris',
          capacite: 4,
          prixNuit: 150,
          googleCalendarId: 'calendar-1',
        },
      ];

      vi.mocked(prisma.gite.findMany).mockResolvedValue(mockGites);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGites);
    });

    it('should return empty array when no gites exist', async () => {
      vi.mocked(prisma.gite.findMany).mockResolvedValue([]);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.gite.findMany).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/gites/:slug', () => {
    it('should return a gite by slug', async () => {
      const mockGite = {
        id: '1',
        slug: 'gite-1',
        nom: 'Gîte 1',
        description: 'Description 1',
        adresse: '123 Rue de Paris',
        capacite: 4,
        prixNuit: 150,
        googleCalendarId: 'calendar-1',
      };

      vi.mocked(prisma.gite.findUnique).mockResolvedValue(mockGite);

      const response = await request(app).get('/gite-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGite);
      // objectContaining: the route also passes `include: { photos: … }`, which
      // is an implementation detail. Asserting the exact object made the test
      // fail on a correct query.
      expect(vi.mocked(prisma.gite.findUnique)).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'gite-1' } })
      );
    });

    it('should return 404 when gite not found', async () => {
      vi.mocked(prisma.gite.findUnique).mockResolvedValue(null);

      const response = await request(app).get('/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/gites (protected)', () => {
    it('should require authentication', async () => {
      const unauthApp = createUnauthenticatedApp();
      const response = await request(unauthApp)
        .post('/')
        .send({ nom: 'New Gite', slug: 'new-gite' });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', 'Bearer mock-token')
        .send({ nom: 'New Gite' }); // Missing slug

      expect([400, 422]).toContain(response.status);
    });

    it('should create a new gite with valid data', async () => {
      const newGite = {
        id: '2',
        slug: 'new-gite',
        nom: 'New Gite',
        description: 'New Description',
        adresse: 'Address',
        capacite: 6,
        prixNuit: 200,
        googleCalendarId: 'calendar-2',
      };

      vi.mocked(prisma.gite.create).mockResolvedValue(newGite);

      const response = await request(app)
        .post('/')
        .set('Authorization', 'Bearer mock-token')
        .send(newGite);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newGite);
    });
  });
});
