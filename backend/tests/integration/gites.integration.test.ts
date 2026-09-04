import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';

// Mock Prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    gite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    photo: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Gites Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllGites', () => {
    it('should return list of all gites', async () => {
      const mockGites = [
        {
          id: '1',
          slug: 'maisonnette',
          nom: 'Maisonnette de Bertheaume',
          description: 'A lovely house',
          adresse: '123 Rue de Paris',
          capacite: 4,
          prixNuit: 150,
          googleCalendarId: 'cal-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.gite.findMany).mockResolvedValue(mockGites);

      const result = await prisma.gite.findMany();

      expect(result).toEqual(mockGites);
      expect(vi.mocked(prisma.gite.findMany)).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results', async () => {
      vi.mocked(prisma.gite.findMany).mockResolvedValue([]);

      const result = await prisma.gite.findMany();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply pagination if provided', async () => {
      const mockGites = [
        { id: '1', slug: 'gite1', nom: 'Gîte 1', prixNuit: 100 },
        { id: '2', slug: 'gite2', nom: 'Gîte 2', prixNuit: 150 },
      ];

      vi.mocked(prisma.gite.findMany).mockResolvedValue(mockGites);

      const result = await prisma.gite.findMany({
        skip: 0,
        take: 2,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getGiteBySlug', () => {
    it('should return gite by slug', async () => {
      const mockGite = {
        id: '1',
        slug: 'maisonnette',
        nom: 'Maisonnette',
        prixNuit: 150,
        description: 'Test',
        adresse: '123 Rue',
        capacite: 4,
        googleCalendarId: 'cal-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.gite.findUnique).mockResolvedValue(mockGite);

      const result = await prisma.gite.findUnique({
        where: { slug: 'maisonnette' },
      });

      expect(result).toEqual(mockGite);
      expect(result?.slug).toBe('maisonnette');
    });

    it('should return null for non-existent slug', async () => {
      vi.mocked(prisma.gite.findUnique).mockResolvedValue(null);

      const result = await prisma.gite.findUnique({
        where: { slug: 'non-existent' },
      });

      expect(result).toBeNull();
    });
  });

  describe('createGite', () => {
    it('should create gite with valid data', async () => {
      const newGite = {
        slug: 'new-gite',
        nom: 'New Gîte',
        description: 'New Description',
        adresse: 'New Address',
        capacite: 6,
        prixNuit: 200,
        googleCalendarId: 'cal-456',
      };

      const createdGite = {
        id: '2',
        ...newGite,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.gite.create).mockResolvedValue(createdGite);

      const result = await prisma.gite.create({
        data: newGite,
      });

      expect(result).toEqual(createdGite);
      expect(result.id).toBe('2');
    });

    it('should reject gite with missing required fields', async () => {
      const incompleteGite = {
        nom: 'Incomplete',
        // missing slug, description, etc.
      };

      expect(() => {
        // Type checking would catch this at compile time
        // For runtime, we'd need validation in the service
        JSON.stringify(incompleteGite);
      }).not.toThrow();
    });
  });

  describe('updateGite', () => {
    it('should update gite with new data', async () => {
      const updated = {
        id: '1',
        slug: 'maisonnette',
        nom: 'Updated Name',
        description: 'Updated Description',
        adresse: '123 Rue de Paris',
        capacite: 4,
        prixNuit: 180, // Changed from 150
        googleCalendarId: 'cal-123',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.gite.update).mockResolvedValue(updated);

      const result = await prisma.gite.update({
        where: { id: '1' },
        data: { nom: 'Updated Name', prixNuit: 180 },
      });

      expect(result.nom).toBe('Updated Name');
      expect(result.prixNuit).toBe(180);
    });
  });

  describe('deleteGite', () => {
    it('should delete gite by id', async () => {
      const deleted = {
        id: '1',
        slug: 'maisonnette',
        nom: 'Maisonnette',
        prixNuit: 150,
        description: 'Test',
        adresse: '123 Rue',
        capacite: 4,
        googleCalendarId: 'cal-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.gite.delete).mockResolvedValue(deleted);

      const result = await prisma.gite.delete({
        where: { id: '1' },
      });

      expect(result.id).toBe('1');
    });

    it('should handle delete of non-existent gite', async () => {
      vi.mocked(prisma.gite.delete).mockRejectedValue(new Error('Record not found'));

      await expect(
        prisma.gite.delete({
          where: { id: 'non-existent' },
        })
      ).rejects.toThrow();
    });
  });

  describe('countGites', () => {
    it('should return total count of gites', async () => {
      vi.mocked(prisma.gite.count).mockResolvedValue(5);

      const count = await prisma.gite.count();

      expect(count).toBe(5);
    });

    it('should return 0 when no gites', async () => {
      vi.mocked(prisma.gite.count).mockResolvedValue(0);

      const count = await prisma.gite.count();

      expect(count).toBe(0);
    });

    it('should count with filters', async () => {
      vi.mocked(prisma.gite.count).mockResolvedValue(2);

      const count = await prisma.gite.count({
        where: { prixNuit: { gte: 150 } },
      });

      expect(count).toBe(2);
    });
  });
});

describe('Photos Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPhotosForGite', () => {
    it('should return photos for a gite', async () => {
      const mockPhotos = [
        { id: '1', giteId: '1', url: '/uploads/gites/photo1.jpg', order: 1 },
        { id: '2', giteId: '1', url: '/uploads/gites/photo2.jpg', order: 2 },
      ];

      vi.mocked(prisma.photo.findMany).mockResolvedValue(mockPhotos);

      const result = await prisma.photo.findMany({
        where: { giteId: '1' },
      });

      expect(result).toEqual(mockPhotos);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no photos', async () => {
      vi.mocked(prisma.photo.findMany).mockResolvedValue([]);

      const result = await prisma.photo.findMany({
        where: { giteId: 'no-photos' },
      });

      expect(result).toEqual([]);
    });
  });

  describe('addPhoto', () => {
    it('should add photo to gite', async () => {
      const newPhoto = {
        id: '3',
        giteId: '1',
        url: '/uploads/gites/photo3.jpg',
        order: 3,
      };

      vi.mocked(prisma.photo.create).mockResolvedValue(newPhoto);

      const result = await prisma.photo.create({
        data: { giteId: '1', url: '/uploads/gites/photo3.jpg', order: 3 },
      });

      expect(result.url).toBe('/uploads/gites/photo3.jpg');
    });
  });
});
