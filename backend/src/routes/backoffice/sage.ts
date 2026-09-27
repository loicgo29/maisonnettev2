import express, { Request, Response } from 'express';
import { SageService, SageInvoice } from '../../services/sage.js';
import { verifyBackofficeToken } from '../../middleware/backoffice-jwt.js';

const router = express.Router();

// Initialize Sage service with credentials from environment
const sageService = new SageService({
  clientId: process.env.SAGE_CLIENT_ID || 'db2V374OdU8r0cL4PWi6Zb43P6eCvNju',
  clientSecret: process.env.SAGE_CLIENT_SECRET || '5QufqqcjpeKfFB25XCtbcAT4NtRMlFFOFbAQcugkubwIJkAIiiYJJiLiXrfhBbNy',
  subscriptionKey: process.env.SAGE_SUBSCRIPTION_KEY || '9314dc42591540d0a4dc1c414723dd8a',
  redirectUri: process.env.SAGE_REDIRECT_URI || 'https://maisonnette-pecheur-bertheaume.fr/admin/comptabilite/auth/callback',
});

/**
 * GET /api/backoffice/sage/auth-url
 * Generate OAuth2 authorization URL for user to grant permissions
 * Public endpoint (no auth required initially)
 */
router.get('/auth-url', (req: Request, res: Response): void => {
  try {
    const state = Math.random().toString(36).substring(7);
    const authUrl = sageService.getAuthorizationUrl(state);

    res.json({
      success: true,
      authUrl,
      state,
      message: 'Visit this URL to authorize Sage access',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate auth URL',
    });
  }
});

/**
 * POST /api/backoffice/sage/auth/callback
 * Handle OAuth2 callback and exchange code for token
 * Should be called after user grants permissions
 */
router.post('/auth/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Authorization code (code) is required',
      });
      return;
    }

    // TODO: Validate state parameter to prevent CSRF attacks
    if (state) {
      // Store state in session and compare
      // Example: if (req.session.sageState !== state) { throw error; }
    }

    const tokenResponse = await sageService.exchangeCodeForToken(code);

    // TODO: Store token securely in database
    // Example:
    // await db.sageToken.upsert({
    //   where: { id: 1 },
    //   update: { token: tokenResponse.access_token, expiresAt: ... },
    //   create: { token: tokenResponse.access_token, expiresAt: ... }
    // });

    res.json({
      success: true,
      message: 'Successfully authenticated with Sage',
      tokenInfo: {
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope,
      },
      // DO NOT send access_token in response body (store securely server-side)
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to exchange auth code for token',
    });
  }
});

/**
 * POST /api/backoffice/sage/set-token
 * Set access token manually (for testing or if stored separately)
 * Protected endpoint - requires backoffice authentication
 */
router.post('/set-token', verifyBackofficeToken, (req: Request, res: Response): void => {
  try {
    const { token, expiresIn } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Access token is required',
      });
      return;
    }

    sageService.setAccessToken(token, expiresIn || 3600);

    res.json({
      success: true,
      message: 'Access token set successfully',
      expiresIn: expiresIn || 3600,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set token',
    });
  }
});

/**
 * POST /api/backoffice/sage/invoices
 * Create a new invoice in Sage
 * Protected endpoint - requires backoffice authentication
 */
router.post('/invoices', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceData: SageInvoice = req.body;

    // Validate required fields
    if (!invoiceData.reference || !invoiceData.date || !invoiceData.customerId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: reference, date, customerId',
      });
      return;
    }

    const result = await sageService.createInvoice(invoiceData);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully in Sage',
      invoice: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    });
  }
});

/**
 * GET /api/backoffice/sage/invoices
 * List all invoices from Sage
 * Protected endpoint - requires backoffice authentication
 */
router.get('/invoices', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId } = req.query;

    const invoices = await sageService.listInvoices({
      status: status as string | undefined,
      customerId: customerId as string | undefined,
    });

    res.json({
      success: true,
      message: `Retrieved ${invoices.length} invoices from Sage`,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list invoices',
    });
  }
});

/**
 * GET /api/backoffice/sage/invoices/:invoiceId
 * Get specific invoice details
 * Protected endpoint - requires backoffice authentication
 */
router.get('/invoices/:invoiceId', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const invoice = await sageService.getInvoice(invoiceId);

    res.json({
      success: true,
      message: 'Invoice retrieved successfully',
      invoice,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invoice',
    });
  }
});

/**
 * PATCH /api/backoffice/sage/invoices/:invoiceId/status
 * Update invoice status (draft, submitted, paid, cancelled)
 * Protected endpoint - requires backoffice authentication
 */
router.patch('/invoices/:invoiceId/status', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'submitted', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const updated = await sageService.updateInvoiceStatus(
      invoiceId,
      status as 'draft' | 'submitted' | 'paid' | 'cancelled'
    );

    res.json({
      success: true,
      message: `Invoice status updated to "${status}"`,
      invoice: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invoice status',
    });
  }
});

/**
 * GET /api/backoffice/sage/customers/:customerId
 * Get customer information from Sage
 * Protected endpoint - requires backoffice authentication
 */
router.get('/customers/:customerId', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    const customer = await sageService.getCustomer(customerId);

    res.json({
      success: true,
      message: 'Customer retrieved successfully',
      customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get customer',
    });
  }
});

/**
 * GET /api/backoffice/sage/health
 * Test connection to Sage API
 * Protected endpoint - requires backoffice authentication
 */
router.get('/health', verifyBackofficeToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const isConnected = await sageService.testConnection();

    if (isConnected) {
      res.json({
        success: true,
        message: 'Connected to Sage API',
        status: 'healthy',
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Cannot connect to Sage API',
        status: 'unhealthy',
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
      status: 'error',
    });
  }
});

export default router;
