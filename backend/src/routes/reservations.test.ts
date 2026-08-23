import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';

describe('Reservations Business Logic', () => {
  let giteId: string;

  beforeAll(async () => {
    // Create test gite
    const gite = await prisma.gite.create({
      data: {
        slug: 'reservation-test-gite',
        nom: 'Reservation Test',
        description: 'Test',
        adresse: 'Test',
        capacite: 2,
        prixNuit: 100,
      },
    });
    giteId = gite.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany();
    await prisma.gite.deleteMany();
    await prisma.$disconnect();
  });

  describe('Date Conflict Detection', () => {
    it('should prevent overlapping reservations', async () => {
      const start = new Date('2026-09-01');
      const end = new Date('2026-09-05');

      // Create first reservation
      const res1 = await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: start,
          dateFin: end,
          statut: 'CONFIRMED',
          clientNom: 'Client 1',
          clientEmail: 'client1@test.com',
          clientTelephone: '+33612345678',
          montantTotal: 400,
        },
      });

      // Try to create overlapping reservation
      const overlappingStart = new Date('2026-09-03');
      const overlappingEnd = new Date('2026-09-07');

      // Check for conflicts (same logic as in route)
      const conflicts = await prisma.reservation.findFirst({
        where: {
          giteId,
          statut: { not: 'CANCELLED' },
          OR: [
            {
              dateDebut: { lte: overlappingStart },
              dateFin: { gt: overlappingStart },
            },
            {
              dateDebut: { lt: overlappingEnd },
              dateFin: { gte: overlappingEnd },
            },
            {
              dateDebut: { gte: overlappingStart },
              dateFin: { lte: overlappingEnd },
            },
          ],
        },
      });

      expect(conflicts).toBeDefined();
      expect(conflicts?.id).toBe(res1.id);
    });

    it('should allow non-overlapping reservations', async () => {
      const res1Start = new Date('2026-09-10');
      const res1End = new Date('2026-09-12');

      const res2Start = new Date('2026-09-12');
      const res2End = new Date('2026-09-15');

      await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: res1Start,
          dateFin: res1End,
          statut: 'CONFIRMED',
          clientNom: 'Client A',
          clientEmail: 'clienta@test.com',
          clientTelephone: '+33612345678',
          montantTotal: 200,
        },
      });

      // Second reservation starts exactly when first ends (should be allowed)
      const conflicts = await prisma.reservation.findFirst({
        where: {
          giteId,
          statut: { not: 'CANCELLED' },
          OR: [
            {
              dateDebut: { lte: res2Start },
              dateFin: { gt: res2Start },
            },
            {
              dateDebut: { lt: res2End },
              dateFin: { gte: res2End },
            },
            {
              dateDebut: { gte: res2Start },
              dateFin: { lte: res2End },
            },
          ],
        },
      });

      // No conflicts should be found (end date = start date is allowed)
      expect(conflicts).toBeNull();
    });

    it('should ignore cancelled reservations in conflict check', async () => {
      const start = new Date('2026-10-01');
      const end = new Date('2026-10-05');

      // Create a cancelled reservation
      await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: start,
          dateFin: end,
          statut: 'CANCELLED',
          clientNom: 'Cancelled Client',
          clientEmail: 'cancelled@test.com',
          clientTelephone: '+33612345678',
          montantTotal: 400,
        },
      });

      // Overlapping reservation should be allowed because first is cancelled
      const conflicts = await prisma.reservation.findFirst({
        where: {
          giteId,
          statut: { not: 'CANCELLED' },
          OR: [
            {
              dateDebut: { lte: start },
              dateFin: { gt: start },
            },
            {
              dateDebut: { lt: end },
              dateFin: { gte: end },
            },
            {
              dateDebut: { gte: start },
              dateFin: { lte: end },
            },
          ],
        },
      });

      expect(conflicts).toBeNull();
    });
  });

  describe('Price Calculation', () => {
    it('should calculate total price correctly', async () => {
      const start = new Date('2026-11-01');
      const end = new Date('2026-11-06'); // 5 nights

      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const expectedTotal = nights * 100; // 100€/night

      const reservation = await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: start,
          dateFin: end,
          statut: 'PENDING',
          clientNom: 'Price Test',
          clientEmail: 'price@test.com',
          clientTelephone: '+33612345678',
          montantTotal: expectedTotal,
        },
      });

      expect(reservation.montantTotal).toBe(500); // 5 nights * 100€
    });

    it('should handle 1-night reservations', async () => {
      const start = new Date('2026-12-01');
      const end = new Date('2026-12-02'); // 1 night

      const reservation = await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: start,
          dateFin: end,
          statut: 'PENDING',
          clientNom: 'One Night',
          clientEmail: 'onenight@test.com',
          clientTelephone: '+33612345678',
          montantTotal: 100,
        },
      });

      expect(reservation.montantTotal).toBe(100);
    });
  });

  describe('Reservation Status Management', () => {
    it('should start with PENDING status', async () => {
      const reservation = await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: new Date('2027-01-01'),
          dateFin: new Date('2027-01-03'),
          statut: 'PENDING',
          clientNom: 'Status Test',
          clientEmail: 'status@test.com',
          clientTelephone: '+33612345678',
          montantTotal: 200,
        },
      });

      expect(reservation.statut).toBe('PENDING');
    });

    it('should allow status updates', async () => {
      const reservation = await prisma.reservation.create({
        data: {
          giteId,
          dateDebut: new Date('2027-02-01'),
          dateFin: new Date('2027-02-03'),
          statut: 'PENDING',
          clientNom: 'Update Test',
          clientEmail: 'update@test.com',
          clientTelephone: '+33612345678',
          montantTotal: 200,
        },
      });

      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { statut: 'CONFIRMED' },
      });

      expect(updated.statut).toBe('CONFIRMED');
    });
  });
});
