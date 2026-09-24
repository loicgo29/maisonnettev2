import express from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { getMatcherService } from '../services/matcher.service.js';
import { getPennylaneService } from '../services/pennylane.service.js';

const router = express.Router();

/**
 * GET /api/matches
 * List all matches
 */
router.get('/', async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        invoice: true,
        transaction: true,
      },
      orderBy: {
        confidence: 'desc',
      },
    });

    res.json({
      message: 'Matches retrieved',
      count: matches.length,
      data: matches,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch matches',
      message: error.message,
    });
  }
});

/**
 * POST /api/matches/find
 * Find matches between invoices and transactions
 * Body: { invoices: [...], transactions: [...] }
 */
router.post('/find', async (req, res) => {
  try {
    const { invoices, transactions } = req.body;

    // Validate input
    if (!Array.isArray(invoices) || !Array.isArray(transactions)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'invoices and transactions must be arrays',
      });
    }

    if (invoices.length === 0 || transactions.length === 0) {
      return res.status(400).json({
        error: 'Empty input',
        message: 'invoices and transactions cannot be empty',
      });
    }

    const matcherService = getMatcherService();
    const matches = matcherService.matchInvoicesToTransactions(invoices, transactions);

    // Save matches to database
    const created = await Promise.all(
      matches.map((m) =>
        prisma.match.create({
          data: {
            invoiceId: m.invoiceId,
            transactionId: m.transactionId,
            confidence: m.confidence,
            status: 'matched',
            notes: m.reason,
          },
        })
      )
    );

    res.json({
      message: 'Matching completed and saved',
      total_invoices: invoices.length,
      total_transactions: transactions.length,
      matches_created: created.length,
      matches: created.map((m) => ({
        id: m.id,
        invoiceId: m.invoiceId,
        transactionId: m.transactionId,
        confidence: (m.confidence * 100).toFixed(1) + '%',
        notes: m.notes,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Matching failed',
      message: error.message,
    });
  }
});

/**
 * PUT /api/matches/:matchId/confirm
 * Confirm a match
 */
router.put('/:matchId/confirm', async (req, res) => {
  try {
    const match = await prisma.match.update({
      where: { id: req.params.matchId },
      data: { status: 'matched' },
      include: { invoice: true, transaction: true },
    });

    res.json({
      message: 'Match confirmed',
      data: match,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Confirmation failed',
      message: error.message,
    });
  }
});

/**
 * PUT /api/matches/:matchId/dispute
 * Dispute a match
 */
router.put('/:matchId/dispute', async (req, res) => {
  try {
    const { reason } = req.body;

    const match = await prisma.match.update({
      where: { id: req.params.matchId },
      data: {
        status: 'disputed',
        notes: reason || null,
      },
      include: { invoice: true, transaction: true },
    });

    res.json({
      message: 'Match disputed',
      data: match,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Dispute failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/matches/compute
 * Compute invoice-to-transaction matches for UI visualization.
 * Returns: invoices, transactions, computed matches with scores & reasons
 */
router.get('/compute', async (req, res) => {
  try {
    const matcher = getMatcherService();
    const pennylane = getPennylaneService();

    // Fetch all invoices
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        date: true,
        amount: true,
        vendor: true,
        description: true,
      },
      orderBy: { date: 'desc' },
    });

    // Fetch transactions from Pennylane
    const transactions = await pennylane.fetchTransactionsNeedingAttachment();

    // Map to matcher format
    const matcherInvoices = invoices.map((inv) => ({
      id: inv.id,
      date: inv.date,
      amount: inv.amount,
      vendor: inv.vendor,
    }));

    const matcherTransactions = transactions.map((t: any) => ({
      id: String(t.id),
      date: new Date(t.date),
      amount: Math.abs(parseFloat(t.currency_amount ?? t.amount ?? '0')),
      description: t.label ?? '',
    }));

    // Compute matches (1:1 only, greedy by confidence)
    const matches = matcher.matchInvoicesToTransactions(matcherInvoices, matcherTransactions);

    // Enrich with full details for UI
    const matchDetails = matches.map((score) => {
      const invoice = invoices.find((i) => i.id === score.invoiceId);
      const transaction = transactions.find((t: any) => String(t.id) === score.transactionId);
      return {
        invoiceId: score.invoiceId,
        transactionId: score.transactionId,
        confidence: score.confidence,
        reason: score.reason,
        invoice,
        transaction,
        status: 'pending',
      };
    });

    // Count unmatched
    const matchedInvoiceIds = new Set(matches.map((m) => m.invoiceId));
    const matchedTransactionIds = new Set(matches.map((m) => m.transactionId));
    const unmatchedInvoices = invoices.filter((i) => !matchedInvoiceIds.has(i.id));
    const unmatchedTransactions = matcherTransactions.filter(
      (t) => !matchedTransactionIds.has(t.id)
    );

    res.json({
      message: 'Matches computed for visualization',
      summary: {
        total_invoices: invoices.length,
        total_transactions: matcherTransactions.length,
        matched_pairs: matches.length,
        unmatched_invoices: unmatchedInvoices.length,
        unmatched_transactions: unmatchedTransactions.length,
        justified_transactions: matches.length,
      },
      invoices,
      transactions: matcherTransactions,
      matches: matchDetails,
      unmatched: {
        invoices: unmatchedInvoices,
        transactions: unmatchedTransactions,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to compute matches',
      message: error.message,
    });
  }
});

export default router;
