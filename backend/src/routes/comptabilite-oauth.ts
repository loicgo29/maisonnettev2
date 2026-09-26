import { Router, Request, Response } from 'express';
import { SageService, SageInvoice } from '../services/sage';
import { prisma } from '../lib/prisma';

const router = Router();

const sageService = new SageService({
  clientId: process.env.SAGE_CLIENT_ID || '',
  clientSecret: process.env.SAGE_CLIENT_SECRET || '',
  subscriptionKey: process.env.SAGE_SUBSCRIPTION_KEY || '',
  redirectUri: process.env.SAGE_REDIRECT_URI || 'https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback',
});

/**
 * POST /api/admin/comptabilite/oauth/authorize
 * Initiate OAuth2 authorization flow
 */
router.post('/authorize', (req: Request, res: Response) => {
  try {
    const state = req.body.state || Math.random().toString(36).substring(7);
    const authUrl = sageService.getAuthorizationUrl(state);
    res.json({ authUrl, state });
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * POST /api/admin/comptabilite/oauth/callback
 * Handle OAuth2 callback (exchange code for token)
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    // Exchange code for token
    const tokenResponse = await sageService.exchangeCodeForToken(code);

    // Store token in database for later use
    await prisma.sageToken.upsert({
      where: { id: 1 }, // Single record for now
      update: {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope,
      },
      create: {
        id: 1,
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope,
      },
    });

    // Set token in service for future use
    sageService.setAccessToken(tokenResponse.access_token, tokenResponse.expires_in);

    return res.json({
      success: true,
      message: 'OAuth2 authorization successful',
      expiresIn: tokenResponse.expires_in,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'OAuth2 authorization failed' });
  }
});

/**
 * POST /api/admin/comptabilite/invoices/sync
 * Sync an invoice to Sage
 */
router.post('/invoices/sync', async (req: Request, res: Response) => {
  try {
    const { invoiceId, reference, date, dueDate, customerId, amount, lines } = req.body;

    // Validate required fields
    if (!reference || !date || !customerId || !lines || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: reference, date, customerId, lines, amount',
      });
    }

    // Retrieve access token from database
    const tokenRecord = await prisma.sageToken.findUnique({ where: { id: 1 } });
    if (!tokenRecord || !tokenRecord.accessToken) {
      return res.status(401).json({ error: 'No valid Sage authorization. Please authorize first.' });
    }

    sageService.setAccessToken(tokenRecord.accessToken, 3600);

    // Create invoice in Sage
    const invoice: SageInvoice = {
      reference,
      date,
      dueDate: dueDate || date,
      customerId,
      amount,
      status: 'draft',
      lines: lines.map((line: Record<string, unknown>) => ({
        description: line.description as string,
        quantity: line.quantity as number,
        unitPrice: line.unitPrice as number,
        taxCode: (line.taxCode as string | undefined) || '',
      })),
    };

    const sageResponse = await sageService.createInvoice(invoice);

    // Store sync record
    await prisma.sageInvoiceSync.create({
      data: {
        localInvoiceId: invoiceId,
        sageInvoiceId: sageResponse.id,
        reference: sageResponse.reference,
        status: sageResponse.status,
        syncedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'Invoice synced to Sage',
      sageInvoiceId: sageResponse.id,
      sageReference: sageResponse.reference,
    });
  } catch (error) {
    console.error('Invoice sync error:', error);
    return res.status(500).json({ error: 'Failed to sync invoice to Sage' });
  }
});

/**
 * GET /api/admin/comptabilite/invoices/:id
 * Get invoice status from Sage
 */
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Retrieve access token
    const tokenRecord = await prisma.sageToken.findUnique({ where: { id: 1 } });
    if (!tokenRecord || !tokenRecord.accessToken) {
      return res.status(401).json({ error: 'No valid Sage authorization' });
    }

    sageService.setAccessToken(tokenRecord.accessToken, 3600);

    // Get invoice from Sage
    const invoice = await sageService.getInvoice(id);

    return res.json(invoice);
  } catch (error) {
    console.error('Invoice fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch invoice from Sage' });
  }
});

/**
 * POST /api/admin/comptabilite/health
 * Check Sage connection
 */
router.post('/health', async (req: Request, res: Response) => {
  try {
    const tokenRecord = await prisma.sageToken.findUnique({ where: { id: 1 } });

    if (!tokenRecord || !tokenRecord.accessToken) {
      return res.json({ connected: false, message: 'No Sage authorization' });
    }

    sageService.setAccessToken(tokenRecord.accessToken, 3600);
    const isConnected = await sageService.testConnection();

    return res.json({
      connected: isConnected,
      lastSync: tokenRecord.updatedAt,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.json({ connected: false, error: 'Health check failed' });
  }
});

export default router;
