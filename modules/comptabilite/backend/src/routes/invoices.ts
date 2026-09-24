import express from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../db.js';
import { getGmailService } from '../services/gmail.service.js';
import { getPDFParserService } from '../services/pdf-parser.service.js';

const UPLOAD_DIR = '/app/uploads/gmail';

const router = express.Router();

/**
 * GET /api/invoices
 * List all invoices from database
 */
router.get('/', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        matches: true,
        syncLogs: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({
      message: 'Invoices retrieved',
      count: invoices.length,
      data: invoices,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch invoices',
      message: error.message,
    });
  }
});

/**
 * POST /api/invoices/sync-gmail
 * Fetch invoices from Gmail and extract metadata
 */
router.post('/sync-gmail', async (req, res) => {
  try {
    const gmailService = getGmailService();
    const pdfService = getPDFParserService();

    // One search per known vendor (Anthropic, Orus, Pennylane, ...) instead
    // of a single generic query — see VENDOR_QUERIES in gmail.service.ts.
    const invoices = await gmailService.fetchAllVendorInvoices();

    const results = [];

    // Parse each PDF (or, when there is none, the message body) and extract metadata
    let created = 0;
    let failed = 0;
    let duplicate = 0;

    for (const invoice of invoices) {
      // Attachment-less receipts (Pennylane, Orus) carry their HT/TVA/TTC
      // breakdown in the body — filename is only defined when there IS an
      // attachment, so results stay identifiable either way.
      const filename = invoice.attachment?.filename ?? `${invoice.subject} (corps de l'email)`;

      // Dedup key: without this, re-running sync-gmail re-creates every
      // invoice from scratch every time (no way to tell "already imported"
      // apart from "new"). Found the hard way on 2026-09-20: 113 duplicate
      // rows in production, 32 already pushed as real duplicate accounting
      // documents in Pennylane (no DELETE endpoint there — had to be
      // cleaned up by hand in the Pennylane UI).
      //
      // Uses the attachment FILENAME, not attachmentId: verified live that
      // Gmail's attachmentId is not stable across separate messages.get
      // calls for the same physical attachment (same content, different id
      // every fetch) — using it as a dedup key silently defeated the
      // dedup entirely and re-created ~30 "new" duplicates on the very next
      // sync-gmail run, which is how this was caught.
      const gmailUid = `${invoice.id}:${invoice.attachment?.filename ?? 'body'}`;
      const existing = await prisma.invoice.findUnique({ where: { gmailUid } });
      if (existing) {
        results.push({ gmailId: invoice.id, filename, status: 'duplicate', dbId: existing.id });
        duplicate++;
        continue;
      }

      try {
        let pdfPath: string | undefined;
        let metadata;

        if (invoice.attachment) {
          const pdfBuffer = await gmailService.downloadAttachment(invoice.id, invoice.attachment.attachmentId);
          metadata = await pdfService.parseInvoice(pdfBuffer, invoice.vendorHint);

          // Persist the PDF so Invoice.pdfUrl is real — POST
          // /supplier_invoices/import (Pennylane) requires an actual
          // uploaded document, and this was previously never written.
          await mkdir(UPLOAD_DIR, { recursive: true });
          pdfPath = path.join(UPLOAD_DIR, `${invoice.id}-${invoice.attachment.filename}`);
          await writeFile(pdfPath, pdfBuffer);
        } else {
          metadata = await pdfService.parseInvoiceFromText(invoice.bodyText ?? '', invoice.vendorHint);
        }

        // Save to database
        const dbInvoice = await prisma.invoice.create({
          data: {
            date: metadata.date,
            amount: metadata.amount,
            amountHT: metadata.amountHT,
            amountTVA: metadata.amountTVA,
            vendor: invoice.vendorHint ?? metadata.vendor,
            description: metadata.description,
            pdfUrl: pdfPath,
            source: 'gmail',
            gmailUid,
          },
        });

        results.push({
          gmailId: invoice.id,
          dbId: dbInvoice.id,
          vendor: invoice.vendorHint ?? metadata.vendor,
          date: metadata.date,
          amount: metadata.amount,
          amountHT: metadata.amountHT,
          amountTVA: metadata.amountTVA,
          invoiceNumber: metadata.invoiceNumber,
          filename,
          status: 'created',
        });
        created++;
      } catch (error: any) {
        results.push({
          gmailId: invoice.id,
          filename,
          status: 'error',
          error: error.message,
        });
        failed++;
      }
    }

    res.json({
      message: 'Gmail sync completed',
      created,
      failed,
      duplicate,
      results,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Gmail sync failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/invoices/create
 * Create invoice manually (for testing without Gmail)
 */
router.post('/create', async (req, res) => {
  try {
    const { date, amount, amountHT, amountTVA, vendor, description, source, pdfUrl } = req.body;

    if (!date || !amount || !vendor) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['date', 'amount', 'vendor'],
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        date: new Date(date),
        amount: parseFloat(amount),
        amountHT: amountHT ? parseFloat(amountHT) : null,
        amountTVA: amountTVA ? parseFloat(amountTVA) : null,
        vendor,
        description: description || `Invoice from ${vendor}`,
        pdfUrl: pdfUrl || null,
        source: source || 'manual',
      },
    });

    res.status(201).json({
      message: 'Invoice created',
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create invoice',
      message: error.message,
    });
  }
});

/**
 * POST /api/invoices/upload
 * Upload invoice PDF manually
 */
router.post('/upload', async (req, res) => {
  // TODO: Implement file upload + PDF parsing
  res.json({
    message: 'Manual upload — pending implementation',
  });
});

/**
 * GET /api/invoices/pending-emails
 * Get emails that failed to process
 */
router.get('/pending-emails', async (req, res) => {
  try {
    const syncLogs = await prisma.syncLog.findMany({
      where: {
        status: 'error',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const pendingEmails = syncLogs.map(log => {
      const meta = log.metadata as any || {};
      return {
        id: log.id,
        subject: meta.subject || 'Sans sujet',
        from: meta.from || 'Inconnu',
        date: meta.date || log.createdAt,
        error: log.error,
        attachment: meta.attachment,
        retry_count: log.retryCount || 0,
      };
    });

    res.json({
      message: 'Pending emails retrieved',
      count: pendingEmails.length,
      data: pendingEmails,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch pending emails',
      message: error.message,
    });
  }
});

/**
 * POST /api/invoices/retry-email/:emailId
 * Retry processing a failed email
 */
router.post('/retry-email/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;

    // Find the sync log
    const syncLog = await prisma.syncLog.findUnique({
      where: { id: emailId },
    });

    if (!syncLog) {
      return res.status(404).json({
        error: 'Email not found',
      });
    }

    // Update retry count
    const updated = await prisma.syncLog.update({
      where: { id: emailId },
      data: {
        retryCount: (syncLog.retryCount || 0) + 1,
        status: 'pending',
      },
    });

    res.json({
      message: 'Email retry queued',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retry email',
      message: error.message,
    });
  }
});

/**
 * GET /api/invoices/:id
 * Get invoice detail
 */
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        matches: true,
        syncLogs: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    res.json({
      message: 'Invoice retrieved',
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch invoice',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice by ID (caution: deletes associated matches and sync logs too)
 */
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: 'Invoice deleted',
      data: invoice,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }
    res.status(500).json({
      error: 'Failed to delete invoice',
      message: error.message,
    });
  }
});

export default router;
