import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// POST: Créer une dépense Gourmelon
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const { who, for_whom, when, what, comment } = req.body;

    // Validations
    if (!for_whom?.trim()) {
      return res.status(400).json({ message: 'Pour qui est obligatoire' });
    }
    if (!what?.trim()) {
      return res.status(400).json({ message: 'Quoi est obligatoire' });
    }

    const expense = await prisma.gourmElonExpense.create({
      data: {
        who: who || 'Loïc',
        for_whom: for_whom.trim(),
        when: new Date(when),
        what: what.trim(),
        comment: comment?.trim() || '',
      },
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err: any) {
    console.error('[Gourmelon] Error creating expense:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET: Lister les dépenses Gourmelon
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.gourmElonExpense.findMany({
      orderBy: { when: 'desc' },
    });
    res.json(expenses);
  } catch (err: any) {
    console.error('[Gourmelon] Error fetching expenses:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

export default router;
