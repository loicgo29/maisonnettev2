import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const CALENDAR_ID = process.env.PUBLIC_CALENDAR_ID || 'lgbertheaume@gmail.com';
		const API_KEY = process.env.GOOGLE_API_KEY || '';

		if (!API_KEY) {
			return json({ error: 'Missing GOOGLE_API_KEY' }, { status: 500 });
		}

		// Fetch public calendar events from Google Calendar API
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
			return json({ error: error.error || 'Failed to fetch calendar' }, { status: response.status });
		}

		const data = await response.json();
		console.log(`✅ Fetched ${data.items?.length || 0} events from public calendar`);

		return json({
			calendar: {
				id: CALENDAR_ID,
				summary: data.summary || 'Public Calendar'
			},
			events: data.items || []
		});
	} catch (error) {
		console.error('💥 Calendar API error:', error);
		return json(
			{ error: 'Server error fetching calendar' },
			{ status: 500 }
		);
	}
}
