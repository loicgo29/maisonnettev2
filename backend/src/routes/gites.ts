import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/gites:
 *   get:
 *     summary: Lister tous les gîtes
 *     tags: [Gîtes]
 *     responses:
 *       200:
 *         description: Liste de tous les gîtes disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Gite'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const gites = await prisma.gite.findMany({
      include: {
        photos: true,
      },
    });
    res.json(gites);
  } catch (error) {
    console.error('Error fetching gites:', error);
    res.status(500).json({ error: 'Failed to fetch gites' });
  }
});

/**
 * @swagger
 * /api/gites/{slug}:
 *   get:
 *     summary: Récupérer un gîte par slug
 *     tags: [Gîtes]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails du gîte
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gite'
 *       404:
 *         description: Gîte non trouvé
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const gite = await prisma.gite.findUnique({
      where: { slug },
      include: {
        photos: {
          orderBy: {
            ordre: 'asc',
          },
        },
      },
    });

    if (!gite) {
      return res.status(404).json({ error: 'Gite not found' });
    }

    return res.json(gite);
  } catch (error) {
    console.error('Error fetching gite:', error);
    return res.status(500).json({ error: 'Failed to fetch gite' });
  }
});

/**
 * @swagger
 * /api/gites:
 *   post:
 *     summary: Créer un nouveau gîte (admin)
 *     tags: [Gîtes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug:
 *                 type: string
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               adresse:
 *                 type: string
 *               capacite:
 *                 type: integer
 *               prixNuit:
 *                 type: number
 *               googleCalendarId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gîte créé avec succès
 *       401:
 *         description: Non authentifié
 *       400:
 *         description: Données invalides
 */
router.post('/', async (req: Request, res: Response) => {
  // TODO: vérifier que l'utilisateur est admin (via token OIDC)
  try {
    const { slug, nom, description, adresse, capacite, prixNuit, googleCalendarId } = req.body;

    const gite = await prisma.gite.create({
      data: {
        slug,
        nom,
        description,
        adresse,
        capacite: parseInt(capacite),
        prixNuit: parseFloat(prixNuit),
        googleCalendarId,
      },
    });

    res.status(201).json(gite);
  } catch (error) {
    console.error('Error creating gite:', error);
    res.status(400).json({ error: 'Failed to create gite' });
  }
});

export default router;
