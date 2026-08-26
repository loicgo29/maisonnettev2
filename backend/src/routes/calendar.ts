import express from 'express';

const router = express.Router();

// NOTE: La vraie implémentation est dans le frontend SvelteKit:
// frontend/src/routes/api/calendar/+server.ts
// Ce fichier n'est pas utilisé — la route calendrier est gérée par SvelteKit OAuth2

router.get('/', (_req, res) => {
  res.status(501).json({ error: 'Use /api/calendar in frontend' });
});

export default router;
