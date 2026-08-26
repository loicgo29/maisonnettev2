import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Récupérer les réservations sous forme d'événements calendrier
 *     tags: [Calendrier]
 *     responses:
 *       200:
 *         description: Liste des événements de réservation
 */
router.get('/', async (_req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        statut: { in: ['EN_ATTENTE_DE_PAIEMENT', 'CONFIRMEE', 'PAYEE'] }
      },
      include: {
        gite: true
      }
    });

    // Convertir les réservations en événements calendrier
    const events = reservations.map(reservation => ({
      id: reservation.id,
      title: `Réservé - ${reservation.gite.nom}`,
      start: {
        date: reservation.dateDebut.toISOString().split('T')[0],
        dateTime: reservation.dateDebut.toISOString()
      },
      end: {
        date: reservation.dateFin.toISOString().split('T')[0],
        dateTime: reservation.dateFin.toISOString()
      },
      description: `Réservation ${reservation.statut}`,
      giteId: reservation.giteId
    }));

    res.json({ events });
  } catch (error) {
    console.error('Erreur récupération calendrier:', error);
    res.status(500).json({ error: 'Impossible de récupérer le calendrier' });
  }
});

export default router;
