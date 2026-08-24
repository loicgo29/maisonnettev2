import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { verifyOIDCToken, AuthRequest } from '../middleware/oidc.js';
import { z } from 'zod';

const router = Router();

// La création d'une demande est ouverte au public : un visiteur doit pouvoir
// réserver sans compte. La limitation de débit remplace l'authentification
// pour contenir les abus.
const limiteurDemandes = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes, réessayez dans une heure.' },
});

const ReservationCreateSchema = z.object({
  giteId: z.string().cuid(),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  clientNom: z.string().min(1),
  clientEmail: z.string().email(),
  clientTelephone: z.string().min(1),
});

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Lister les réservations de l'utilisateur
 *     tags: [Réservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des réservations de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Non authentifié
 */
router.get('/', verifyOIDCToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub || req.user?.email;

    // Récupérer les réservations (optionnel: filtrer par email de l'utilisateur)
    const reservations = await prisma.reservation.findMany({
      where: {
        clientEmail: userId,
      },
      include: {
        gite: true,
      },
      orderBy: {
        dateDebut: 'desc',
      },
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Créer une nouvelle réservation
 *     tags: [Réservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               giteId:
 *                 type: string
 *               dateDebut:
 *                 type: string
 *                 format: date-time
 *               dateFin:
 *                 type: string
 *                 format: date-time
 *               clientNom:
 *                 type: string
 *               clientEmail:
 *                 type: string
 *               clientTelephone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réservation créée (en attente de paiement)
 *       400:
 *         description: Données invalides
 *       429:
 *         description: Trop de demandes
 */
router.post('/', limiteurDemandes, async (req: Request, res: Response) => {
  try {
    const parsed = ReservationCreateSchema.parse(req.body);

    // Vérifier que le gîte existe
    const gite = await prisma.gite.findUnique({
      where: { id: parsed.giteId },
    });

    if (!gite) {
      return res.status(404).json({ error: 'Gite not found' });
    }

    // Vérifier que les dates ne chevaucheront pas une réservation existante
    const conflicts = await prisma.reservation.findFirst({
      where: {
        giteId: parsed.giteId,
        statut: { not: 'CANCELLED' },
        OR: [
          // dateDebut is within existing reservation
          {
            dateDebut: { lte: new Date(parsed.dateDebut) },
            dateFin: { gt: new Date(parsed.dateDebut) },
          },
          // dateFin is within existing reservation
          {
            dateDebut: { lt: new Date(parsed.dateFin) },
            dateFin: { gte: new Date(parsed.dateFin) },
          },
          // new reservation completely encompasses existing
          {
            dateDebut: { gte: new Date(parsed.dateDebut) },
            dateFin: { lte: new Date(parsed.dateFin) },
          },
        ],
      },
    });

    if (conflicts) {
      return res.status(400).json({ error: 'Dates not available for this gite' });
    }

    // Calculer le montant total
    const nights = Math.ceil(
      (new Date(parsed.dateFin).getTime() - new Date(parsed.dateDebut).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const montantTotal = nights * gite.prixNuit;

    // Créer la réservation avec statut PENDING (en attente de paiement Stripe)
    const reservation = await prisma.reservation.create({
      data: {
        ...parsed,
        montantTotal,
        statut: 'PENDING',
      },
      include: {
        gite: true,
      },
    });

    return res.status(201).json(reservation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating reservation:', error);
    return res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Récupérer une réservation
 *     tags: [Réservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de la réservation
 *       404:
 *         description: Réservation non trouvée
 */
router.get('/:id', verifyOIDCToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        gite: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Optionnel: vérifier que l'utilisateur est propriétaire de la réservation
    // (pour l'instant, on retourne la réservation si elle existe)

    return res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

export default router;
