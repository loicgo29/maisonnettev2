import { json } from '@sveltejs/kit';

export async function GET({ cookies }) {
  const token = cookies.get('auth_token');

  if (!token) {
    return json({ token: null }, { status: 200 });
  }

  return json({ token }, { status: 200 });
}

export async function DELETE({ cookies }) {
  cookies.delete('auth_token', { path: '/' });
  return json({ success: true });
}
