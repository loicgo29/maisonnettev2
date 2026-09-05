import { json } from '@sveltejs/kit';
import { PUBLIC_AUTH_URL, PUBLIC_AUTH_REALM, PUBLIC_AUTH_CLIENT_ID } from '$env/static/public';

const REALM_URL = `${PUBLIC_AUTH_URL}/realms/${PUBLIC_AUTH_REALM}`;

export async function POST({ request, cookies }) {
  try {
    const { code, codeVerifier } = await request.json();

    if (!code || !codeVerifier) {
      return json({ error: 'Missing code or codeVerifier' }, { status: 400 });
    }

    // Exchange code for token
    const response = await fetch(`${REALM_URL}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: PUBLIC_AUTH_CLIENT_ID,
        code,
        redirect_uri: `${new URL(request.url).origin}/admin/callback`,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return json(
        { error: `Token exchange failed (${response.status})`, detail },
        { status: 401 }
      );
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // Store in HTTP-only cookie (secure, httpOnly, sameSite)
    cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return json({ success: true, redirectTo: '/admin' });
  } catch (error) {
    console.error('[AUTH] Callback error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
