import type { Handle } from '@sveltejs/kit';

/**
 * Proxifie les requêtes /api/* vers le backend Express.
 * Harmonise le dev local (Docker) avec la prod (où Caddy proxifie).
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		const backendUrl = 'http://backend:3001' + event.url.pathname + event.url.search;

		const response = await fetch(backendUrl, {
			method: event.request.method,
			headers: event.request.headers,
			body: event.request.method !== 'GET' && event.request.method !== 'HEAD'
				? event.request.body
				: undefined
		});

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers
		});
	}

	return resolve(event);
};
