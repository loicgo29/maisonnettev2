import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.PRIVATE_GOOGLE_CLIENT_ID;
    const redirectUri = process.env.PRIVATE_GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      res.status(400).json({
        error: 'Configuration Google Calendar manquante',
        authUrl: null,
      });
      return;
    }

    // Construire l'URL d'authentification Google OAuth2
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');

    res.json({
      authUrl: authUrl.toString(),
      events: [],
    });
  } catch (error) {
    console.error('Calendar endpoint error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du calendrier',
    });
  }
});

export default router;
