import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import reservationsRouter from '../../src/routes/reservations';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    reservation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// The router declares verifyOIDCToken on each route (router.get('/', verifyOIDCToken, …)),
// so mounting a mock middleware before the router does not replace it — the real
// one still ran and rejected every request with "Missing authorization header".
// Mocking the module is what actually substitutes it.

// Configurable mock: by default authenticated, but can be told to reject.
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
  app.use(reservationsRouter);
  return app;
};

const createUnauthenticatedApp = () => {
  authConfiguredToReject = true;
  const app = express();
  app.use(express.json());
  app.use(reservationsRouter);
  return app;
};

describe('Reservations Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createAuthenticatedApp();
  });

  describe('GET /api/reservations', () => {
    it('should return list of reservations for authenticated user', async () => {
      const mockReservations = [
        {
          id: '1',
          giteId: 'gite-1',
          dateDebut: new Date('2026-09-01'),
          dateFin: new Date('2026-09-05'),
          statut: 'CONFIRMED',
          clientNom: 'John Doe',
          clientEmail: 'john@example.com',
          clientPhone: '+33612345678',
          montantTotal: 600,
          stripePaymentIntentId: 'pi_123',
          googleCalendarEventId: 'event-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.reservation.findMany).mockResolvedValue(mockReservations);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      // Date objects are serialized to ISO strings in HTTP/JSON responses
      expect(response.body).toMatchObject(
        mockReservations.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          dateDebut: r.dateDebut.toISOString(),
          dateFin: r.dateFin.toISOString(),
        }))
      );
    });

    it('should return 401 without authentication', async () => {
      const unauthApp = createUnauthenticatedApp();

      const response = await request(unauthApp).get('/');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reservations/:id', () => {
    it('should return a single reservation', async () => {
      const mockReservation = {
        id: '1',
        giteId: 'gite-1',
        dateDebut: new Date('2026-09-01'),
        dateFin: new Date('2026-09-05'),
        statut: 'CONFIRMED',
        clientNom: 'John Doe',
        clientEmail: 'john@example.com',
        clientPhone: '+33612345678',
        montantTotal: 600,
        stripePaymentIntentId: 'pi_123',
        googleCalendarEventId: 'event-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.reservation.findUnique).mockResolvedValue(mockReservation);

      const response = await request(app).get('/1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ...mockReservation,
        createdAt: mockReservation.createdAt.toISOString(),
        updatedAt: mockReservation.updatedAt.toISOString(),
        dateDebut: mockReservation.dateDebut.toISOString(),
        dateFin: mockReservation.dateFin.toISOString(),
      });
    });

    it('should return 404 when reservation not found', async () => {
      vi.mocked(prisma.reservation.findUnique).mockResolvedValue(null);

      const response = await request(app).get('/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/reservations', () => {
    it('should create a new reservation', async () => {
      const newReservation = {
        giteId: 'gite-1',
        dateDebut: '2026-09-01',
        dateFin: '2026-09-05',
        clientNom: 'Jane Smith',
        clientEmail: 'jane@example.com',
        clientPhone: '+33687654321',
      };

      const created = {
        id: '2',
        ...newReservation,
        dateDebut: new Date(newReservation.dateDebut),
        dateFin: new Date(newReservation.dateFin),
        statut: 'PENDING',
        montantTotal: 600,
        stripePaymentIntentId: null,
        googleCalendarEventId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      vi.mocked(prisma.reservation.create).mockResolvedValue(created);

      const response = await request(app)
        .post('/')
        .send(newReservation);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: '2',
        statut: 'PENDING',
        giteId: 'gite-1',
        montantTotal: 600,
      });
    });

    it('should validate date range', async () => {
      const invalidReservation = {
        giteId: 'gite-1',
        dateDebut: '2026-09-05',
        dateFin: '2026-09-01', // End before start
        clientNom: 'Jane Smith',
        clientEmail: 'jane@example.com',
        clientPhone: '+33687654321',
      };

      const response = await request(app)
        .post('/')
        .send(invalidReservation);

      expect([400, 422]).toContain(response.status);
    });

    it('should check for date conflicts', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { count: 1 }, // Conflict found
      ]);

      const conflictingReservation = {
        giteId: 'gite-1',
        dateDebut: '2026-09-01',
        dateFin: '2026-09-05',
        clientNom: 'Jane Smith',
        clientEmail: 'jane@example.com',
        clientPhone: '+33687654321',
      };

      const response = await request(app)
        .post('/')
        .send(conflictingReservation);

      expect([400, 409]).toContain(response.status);
    });

    it('should validate required fields', async () => {
      const incompleteReservation = {
        giteId: 'gite-1',
        dateDebut: '2026-09-01',
        // Missing dateFin
        clientNom: 'Jane Smith',
      };

      const response = await request(app)
        .post('/')
        .send(incompleteReservation);

      expect([400, 422]).toContain(response.status);
    });
  });
});
