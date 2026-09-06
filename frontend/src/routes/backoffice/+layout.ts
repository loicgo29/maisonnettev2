import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, data }) => {
	// NE PAS rediriger si on est sur /backoffice/login
	if (url.pathname === '/backoffice/login') {
		return { ...data };
	}

	// Vérifier le token au NIVEAU DU SERVEUR (hook), pas en onMount()
	// Cela garantit que la redirection se fait AVANT le rendu du layout
	const token = data.backofficeToken;

	if (!token) {
		throw redirect(302, '/backoffice/login');
	}

	return {
		...data,
		isAuthenticated: !!token,
	};
};
