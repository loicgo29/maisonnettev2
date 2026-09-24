import express from 'express';
import prisma from '../db.js';
import { getPennylaneService } from '../services/pennylane.service.js';
import { getMatcherService } from '../services/matcher.service.js';

const router = express.Router();

/**
 * GET /api/sync/status
 * Check Pennylane connection and get last sync status
 */
router.get('/status', async (req, res) => {
  try {
    const pennylaneService = getPennylaneService();
    const connected = await pennylaneService.healthCheck();

    // Get last sync
    const lastSync = await prisma.syncLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: connected ? 'connected' : 'disconnected',
      lastSync: lastSync || null,
      message: connected ? 'Connected to Pennylane' : 'Failed to connect to Pennylane',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync/pennylane
 * Push invoices to Pennylane as supplier invoices.
 *
 * v2's /supplier_invoices/import REQUIRES a real PDF (file_attachment_id) —
 * there is no "create without a document" path. This app never persists the
 * PDF bytes it downloads from Gmail (Invoice.pdfUrl exists in the schema but
 * nothing writes to it yet), so every invoice synced today is skipped with
 * an explicit reason rather than silently reported as synced. Storing the
 * PDF (disk or object storage) so pdfUrl is populated is the next step
 * before this route can actually push anything.
 *
 * ~~Bank transactions and match confirmations are NOT synced here~~ — as of
 * 2026-09-20, Crédit Agricole and Wise turned out to already be connected
 * directly to Pennylane as bank feeds (confirmed via GET /bank_accounts),
 * so the appairage itself now happens in POST /match-pennylane below,
 * against Pennylane's own /transactions, instead of a local CSV import.
 */
router.post('/pennylane', async (req, res) => {
  try {
    // Skip invoices already pushed — this route has no dedup otherwise, and
    // running it twice would create duplicate supplier invoices upstream.
    const invoices = await prisma.invoice.findMany({ where: { pennylaneInvoiceId: null } });

    if (invoices.length === 0) {
      return res.status(400).json({
        error: 'No data to sync',
        message: 'Need at least 1 invoice not already pushed to Pennylane',
      });
    }

    const pennylaneService = getPennylaneService();
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const inv of invoices) {
      if (!inv.pdfUrl) {
        await prisma.syncLog.create({
          data: {
            invoiceId: inv.id,
            status: 'error',
            message: 'Skipped: no PDF stored for this invoice (pdfUrl empty) — Pennylane import requires one.',
          },
        });
        skipped++;
        continue;
      }

      try {
        const { readFile } = await import('node:fs/promises');
        const pdfBuffer = await readFile(inv.pdfUrl);
        const document = await pennylaneService.createSupplierInvoice(
          inv.id,
          inv.amount,
          inv.vendor,
          inv.date,
          pdfBuffer,
          `${inv.id}.pdf`,
          { amountHT: inv.amountHT ?? undefined, amountTVA: inv.amountTVA ?? undefined }
        );
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { pennylaneInvoiceId: String(document.id) },
        });
        await prisma.syncLog.create({
          data: { invoiceId: inv.id, status: 'synced', message: `Synced to Pennylane (id ${document.id})` },
        });
        synced++;
      } catch (error: any) {
        const apiDetail = error.response?.data ? JSON.stringify(error.response.data) : undefined;
        await prisma.syncLog.create({
          data: { invoiceId: inv.id, status: 'error', message: apiDetail ? `${error.message}: ${apiDetail}` : error.message },
        });
        errors++;
      }
    }

    res.json({
      message: 'Sync to Pennylane completed',
      synced,
      skipped,
      errors,
      invoices_total: invoices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Sync failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/sync/match-pennylane
 * Native appairage: match invoices already pushed to Pennylane against
 * Pennylane's own bank transactions (CA/Wise, connected directly — see
 * PLAN.md Phase D) instead of a locally-parsed CSV. Confidence > 0.7
 * confirmations are written back to Pennylane via matched_transactions,
 * which is the real appairage; nothing is persisted in the local `Match`
 * table (Pennylane is the source of truth here, not this app's database).
 */
router.post('/match-pennylane', async (req, res) => {
  try {
    const pennylaneService = getPennylaneService();
    const matcherService = getMatcherService();

    const invoices = await prisma.invoice.findMany({ where: { pennylaneInvoiceId: { not: null } } });
    const transactions = await pennylaneService.fetchTransactionsNeedingAttachment();

    if (invoices.length === 0) {
      return res.json({ message: 'No invoices synced to Pennylane yet — nothing to match', matched: 0 });
    }

    const matcherInvoices = invoices.map((inv) => ({ id: inv.id, date: inv.date, amount: inv.amount, vendor: inv.vendor }));
    const matcherTransactions = transactions.map((t: any) => ({
      id: String(t.id),
      date: new Date(t.date),
      amount: Math.abs(parseFloat(t.currency_amount ?? t.amount ?? '0')),
      description: t.label ?? '',
    }));

    const scored = matcherService.matchInvoicesToTransactions(matcherInvoices, matcherTransactions);

    let matched = 0;
    let errors = 0;
    const results = [];

    for (const score of scored) {
      const invoice = invoices.find((i) => i.id === score.invoiceId)!;
      try {
        await pennylaneService.matchTransactionToSupplierInvoice(
          invoice.pennylaneInvoiceId!,
          parseInt(score.transactionId, 10)
        );
        results.push({ ...score, status: 'matched' });
        matched++;
      } catch (error: any) {
        results.push({ ...score, status: 'error', error: error.message });
        errors++;
      }
    }

    res.json({
      message: 'Pennylane native matching completed',
      invoices_checked: invoices.length,
      transactions_available: transactions.length,
      matched,
      errors,
      results,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Pennylane matching failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/sync/invoices-pennylane
 * Fetch invoices from Pennylane for reconciliation
 */
router.get('/invoices-pennylane', async (req, res) => {
  try {
    const pennylaneService = getPennylaneService();
    const invoices = await pennylaneService.fetchInvoices();

    res.json({
      message: 'Invoices fetched from Pennylane',
      count: invoices.length,
      invoices,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/sync/logs
 * Get sync history from database
 */
router.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50
    });

    res.json({
      message: 'Sync logs retrieved',
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch logs',
      message: error.message,
    });
  }
});

export default router;
