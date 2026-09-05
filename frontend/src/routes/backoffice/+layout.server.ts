import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	// En dev, le token est en localStorage (côté client)
	// En prod, il devrait être en secure HTTP-only cookies
	// Pour l'instant, on le transmet via data
	return {
		backofficeToken: null, // TODO: récupérer du cookie si existe
	};
};
