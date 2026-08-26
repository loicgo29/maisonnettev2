import express from 'express';
import { google } from 'googleapis';

const router = express.Router();

// Calendrier dédié pour les réservations du gîte
const GITE_CALENDAR_ID = process.env.GITE_GOOGLE_CALENDAR_ID || 'primary';

/**
 * GET /api/calendar
 * Récupère les événements du calendrier dédié du gîte
 */
router.get('/', async (req, res) => {
  try {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath) {
      return res.status(400).json({ error: 'Google Calendar not configured' });
    }

    // Lire la clé de service
    const { promises: fs } = await import('fs');
    const keyFile = await fs.readFile(keyPath, 'utf-8');
    const keyData = JSON.parse(keyFile);

    // Authentifier avec Google
    const auth = new google.auth.GoogleAuth({
      credentials: keyData,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Récupérer les événements des 12 prochains mois
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const response = await calendar.events.list({
      calendarId: GITE_CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: nextYear.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const events = response.data.items || [];

    // Filtrer: uniquement les événements confirmés (pas cancelled)
    const filteredEvents = events.filter((event: any) => event.status !== 'cancelled');

    res.json({ events: filteredEvents });
  } catch (error) {
    console.error('[Calendar] Error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;
