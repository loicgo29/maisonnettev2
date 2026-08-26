import { json } from '@sveltejs/kit';

// Utilise "primary" = ton calendrier principal
// Ou remplace par l'ID du calendrier dédié aux réservations
const CALENDAR_ID = process.env.GITE_CALENDAR_ID || 'primary';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8030/api/calendar/callback';

export async function GET({ cookies }) {
	try {
		// Vérifier si on a un token d'accès stocké
		const accessToken = cookies.get('google_calendar_token');

		if (!accessToken) {
			// Rediriger vers l'authentification OAuth2
			const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly');
			const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
				`client_id=${CLIENT_ID}&` +
				`redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
				`response_type=code&` +
				`scope=${scope}&` +
				`access_type=offline`;

			return json({ authUrl });
		}

		// Récupérer les événements du calendrier avec le token d'accès
		const now = new Date().toISOString();
		const response = await fetch(
			`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?` +
			`timeMin=${encodeURIComponent(now)}&` +
			`maxResults=10&` +
			`singleEvents=true&` +
			`orderBy=startTime`,
			{
				headers: {
					'Authorization': `Bearer ${accessToken}`
				}
			}
		);

		if (!response.ok) {
			if (response.status === 401) {
				// Token expiré, supprimer et rediriger
				cookies.delete('google_calendar_token', { path: '/' });
				return json({ error: 'Token expiré, re-authentification nécessaire' }, { status: 401 });
			}
			return json(
				{ error: 'Erreur lors de la récupération du calendrier' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json({ events: data.items || [] });
	} catch (error) {
		console.error('Calendar API error:', error);
		return json(
			{ error: 'Erreur serveur' },
			{ status: 500 }
		);
	}
}

// Callback OAuth2
export async function POST({ url, cookies }) {
	try {
		const code = url.searchParams.get('code');

		if (!code) {
			return json({ error: 'Code non fourni' }, { status: 400 });
		}

		// Échanger le code contre un token d'accès
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				code,
				client_id: CLIENT_ID || '',
				client_secret: CLIENT_SECRET || '',
				redirect_uri: REDIRECT_URI,
				grant_type: 'authorization_code'
			}).toString()
		});

		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			return json({ error: tokenData.error }, { status: 400 });
		}

		// Stocker le token d'accès dans un cookie sécurisé
		cookies.set('google_calendar_token', tokenData.access_token, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: tokenData.expires_in,
			path: '/'
		});

		return json({ success: true });
	} catch (error) {
		console.error('OAuth2 error:', error);
		return json({ error: 'Erreur d\'authentification' }, { status: 500 });
	}
}
