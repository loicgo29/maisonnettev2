import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get('backoffice_token');
	return {
		backofficeToken: token || null,
	};
};
