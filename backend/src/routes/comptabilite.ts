import express from 'express';
import comptabiliteOAuthRouter from './comptabilite-oauth.js';

const router = express.Router();

// OAuth2 endpoints for Sage authentication
router.use('/oauth', comptabiliteOAuthRouter);

/**
 * GET /api/admin/comptabilite/status
 * Simple health check for comptabilite module
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Comptabilité module is available',
    timestamp: new Date().toISOString(),
  });
});

export default router;
