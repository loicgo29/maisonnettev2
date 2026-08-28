import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/alo/accounts
router.get('/accounts', async (_req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.aloAccounts.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/alo/accounts/:id
router.get('/accounts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const account = await prisma.aloAccounts.findUnique({
      where: { id: parseInt(id) }
    });
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// POST /api/alo/expenses
router.post('/expenses', async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_id, amount, category, label, date } = req.body;

    // Validate input
    if (!account_id || !amount || !category || !date) {
      res.status(400).json({ error: 'Missing required fields: account_id, amount, category, date' });
      return;
    }

    const expense = await prisma.aloExpenses.create({
      data: {
        account_id: parseInt(account_id),
        amount: parseFloat(amount),
        category,
        label: label || null,
        date: new Date(date),
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// GET /api/alo/expenses
router.get('/expenses', async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_id } = req.query;

    const expenses = await prisma.aloExpenses.findMany({
      where: account_id ? { account_id: parseInt(account_id as string) } : {},
      orderBy: { date: 'desc' }
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET /api/alo/expenses/:id
router.get('/expenses/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const expense = await prisma.aloExpenses.findUnique({
      where: { id: parseInt(id) }
    });
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// PUT /api/alo/expenses/:id
router.put('/expenses/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, category, label, date } = req.body;

    const expense = await prisma.aloExpenses.update({
      where: { id: parseInt(id) },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(category && { category }),
        ...(label !== undefined && { label }),
        ...(date && { date: new Date(date) }),
        updated_at: new Date()
      }
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/alo/expenses/:id
router.delete('/expenses/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.aloExpenses.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /api/alo/periods
router.get('/periods', async (_req: Request, res: Response): Promise<void> => {
  try {
    const periods = await prisma.aloPeriods.findMany({
      orderBy: { startDate: 'desc' }
    });
    res.json(periods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch periods' });
  }
});

// POST /api/alo/periods
router.post('/periods', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, startDate, endDate, status } = req.body;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    const period = await prisma.aloPeriods.create({
      data: {
        name: name || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'draft',
        createdAt: new Date()
      }
    });

    res.status(201).json(period);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create period' });
  }
});

// Health check
router.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', module: 'alo' });
});

export default router;
