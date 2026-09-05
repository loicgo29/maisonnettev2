import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, data }) => {
	console.log('[Layout] URL:', url.pathname);
	console.log('[Layout] data.backofficeToken:', data.backofficeToken ? 'YES' : 'NO');

	// NE PAS rediriger si on est sur /backoffice/login
	if (url.pathname === '/backoffice/login') {
		console.log('[Layout] On login page, allowing');
		return { ...data };
	}

	// Vérifier le token au NIVEAU DU SERVEUR (hook), pas en onMount()
	// Cela garantit que la redirection se fait AVANT le rendu du layout
	const token = data.backofficeToken; // Voir +layout.server.ts

	if (!token) {
		// Redirection côté serveur (plus rapide, pas de flicker)
		console.log('[Layout] No token, redirecting to login');
		throw redirect(302, '/backoffice/login');
	}

	console.log('[Layout] Token found, allowing access');
	return {
		...data,
		isAuthenticated: !!token,
	};
};
