import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	console.log('Signing out user');

	// Clear the session cookie
	cookies.delete('bluesky-session', { path: '/' });

	console.log('Session cleared, redirecting to signin');

	// Redirect to signin page
	throw redirect(302, '/auth/signin');
};