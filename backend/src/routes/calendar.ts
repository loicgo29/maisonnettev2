import express, { Request, Response } from 'express';

const router = express.Router();

// PUBLIC: Retourne les événements publics du calendrier
router.get('/public', async (_req: Request, res: Response): Promise<void> => {
  try {
    const CALENDAR_ID = process.env.PUBLIC_CALENDAR_ID || 'lgbertheaume@gmail.com';
    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
      res.status(400).json({ error: 'Missing GOOGLE_API_KEY' });
      return;
    }

    const now = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?` +
      `key=${API_KEY}&` +
      `timeMin=${encodeURIComponent(now)}&` +
      `maxResults=10&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Google Calendar API error:', error);
      res.status(response.status).json({ error: error.error || 'Failed to fetch calendar' });
      return;
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.items?.length || 0} events from public calendar`);

    res.json({
      calendar: {
        id: CALENDAR_ID,
        summary: data.summary || 'Public Calendar'
      },
      events: data.items || []
    });
  } catch (error) {
    console.error('💥 Calendar API error:', error);
    res.status(500).json({ error: 'Server error fetching calendar' });
  }
});

// PRIVATE: Retourne l'URL d'authentification Google
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
