import express from 'express';
import comptabiliteOAuthRouter from './comptabilite-oauth.js';
import { requireKeycloakAuth } from '../middleware/keycloak-auth.js';

const router = express.Router();

// All comptabilite routes require Keycloak authentication
router.use(requireKeycloakAuth);

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
