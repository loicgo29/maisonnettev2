import express from 'express';
import prisma from '../db.js';
import { getBankParserService } from '../services/bank-parser.service.js';

const router = express.Router();

/**
 * GET /api/transactions
 * List all transactions from database
 */
router.get('/', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        matches: true,
        syncLogs: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({
      message: 'Transactions retrieved',
      count: transactions.length,
      data: transactions,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch transactions',
      message: error.message,
    });
  }
});

/**
 * POST /api/transactions/upload-csv
 * Upload bank statement CSV and parse
 */
router.post('/upload-csv', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    // Raw bytes, not express.text(): the Crédit Agricole export is
    // Windows-1252, and express.text() decodes as UTF-8 before we ever see
    // it — by then the accented bytes are already replaced, not just
    // mis-displayed. parseCSVBuffer() picks the right decoding itself.
    const csvBuffer: Buffer = req.body;
    const account = req.query.account as string || 'Unknown';

    const bankService = getBankParserService();
    const parsedTransactions = bankService.parseCSVBuffer(csvBuffer, account);

    // Fail loudly: returning 200 with created:0 made a broken upload look like
    // a successful one, which is how an unusable CSV went unnoticed.
    if (parsedTransactions.length === 0) {
      return res.status(400).json({
        error: 'No transaction parsed',
        message:
          'Aucune ligne exploitable dans le CSV. Formats acceptés : Crédit Agricole, Wise, générique (Date, Description, Montant), Revolut ou BNP. La première ligne est traitée comme un en-tête.',
      });
    }

    // Save to database
    const created = await Promise.all(
      parsedTransactions.map((t) =>
        prisma.transaction.create({
          data: {
            date: t.date,
            amount: t.amount,
            description: t.description,
            account: t.account,
          },
        })
      )
    );

    res.json({
      message: 'CSV parsed and saved successfully',
      account,
      created: created.length,
      transactions: created.map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
        account: t.account,
      })),
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'CSV parsing or saving failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/transactions/upload-ofx
 * Upload bank statement OFX and parse
 */
router.post('/upload-ofx', express.text(), async (req, res) => {
  try {
    const ofxContent = req.body;
    const account = req.query.account as string || 'Unknown';

    const bankService = getBankParserService();
    const parsedTransactions = bankService.parseOFX(ofxContent, account);

    if (parsedTransactions.length === 0) {
      return res.status(400).json({
        error: 'No transaction parsed',
        message:
          'Aucune transaction trouvée dans le fichier OFX (blocs <STMTTRN> attendus).',
      });
    }

    // Save to database
    const created = await Promise.all(
      parsedTransactions.map((t) =>
        prisma.transaction.create({
          data: {
            date: t.date,
            amount: t.amount,
            description: t.description,
            account: t.account,
          },
        })
      )
    );

    res.json({
      message: 'OFX parsed and saved successfully',
      account,
      created: created.length,
      transactions: created.map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
        account: t.account,
      })),
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'OFX parsing or saving failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction detail
 */
router.get('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        matches: true,
        syncLogs: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    res.json({
      message: 'Transaction retrieved',
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch transaction',
      message: error.message,
    });
  }
});

export default router;
