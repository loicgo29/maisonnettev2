import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	// DEV MODE: Set a dummy token so the client-side can use it
	// TODO: Remove this in production
	if (!cookies.get('jeton')) {
		const dummyToken = 'dev-token-' + Date.now();
		// Store in cookie so it persists across requests
		cookies.set('jeton', dummyToken, {
			path: '/',
			maxAge: 60 * 60 * 24, // 24 hours
			httpOnly: false, // Must be false so client JS can read it
		});
	}

	return {};
};
