import express from 'express';

const router = express.Router();

/**
 * GET /api/comptabilite/status
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
