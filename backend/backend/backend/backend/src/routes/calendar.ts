import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        statut: { in: ['EN_ATTENTE_DE_PAIEMENT', 'CONFIRMEE', 'PAYEE'] }
      },
      include: { gite: true }
    });

    const events = reservations.map(reservation => ({
      id: reservation.id,
      title: `Réservé`,
      start: {
        date: reservation.dateDebut.toISOString().split('T')[0],
        dateTime: reservation.dateDebut.toISOString()
      },
      end: {
        date: reservation.dateFin.toISOString().split('T')[0],
        dateTime: reservation.dateFin.toISOString()
      }
    }));

    res.json({ events });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

export default router;
