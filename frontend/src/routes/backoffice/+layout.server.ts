import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('backoffice_token');
	console.log('[Layout.server] URL:', url.pathname);
	console.log('[Layout.server] Token from cookie:', token ? 'YES' : 'NO');
	return {
		backofficeToken: token || null,
	};
};
