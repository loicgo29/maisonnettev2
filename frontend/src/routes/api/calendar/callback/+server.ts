import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const { url, cookies } = event;
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error) {
		return new Response(JSON.stringify({ error }), { status: 400 });
	}

	if (!code) {
		return new Response(JSON.stringify({ error: 'Missing authorization code' }), { status: 400 });
	}

	const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
	const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
	const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

	try {
		console.log('🔐 Callback received with code:', code);
		console.log('📍 Environment:', { CLIENT_ID: CLIENT_ID.slice(0, 10) + '...', REDIRECT_URI });

		// Exchange authorization code for access token
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				code,
				grant_type: 'authorization_code',
				redirect_uri: REDIRECT_URI
			})
		});

		console.log('📤 Token response status:', tokenResponse.status);

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json();
			console.error('❌ Token error:', errorData);
			return new Response(JSON.stringify({ error: errorData }), { status: 400 });
		}

		const tokenData = await tokenResponse.json();
		const { access_token, expires_in } = tokenData;

		console.log('✅ Token received, expires in:', expires_in);

		// Store token in http-only cookie
		cookies.set('calendar_token', access_token, {
			path: '/',
			httpOnly: true,
			secure: false,
			sameSite: 'lax',
			maxAge: expires_in || 3600
		});

		console.log('🍪 Cookie set, redirecting to /calendar');

		// Redirect to calendar page
		throw redirect(302, '/calendar');
	} catch (err) {
		console.error('💥 Callback error:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
	}
}
