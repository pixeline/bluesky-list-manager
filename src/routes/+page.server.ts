import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	console.log('Main page load called');
	console.log('Session exists:', !!locals.session);

	// Redirect if not authenticated
	if (!locals.session) {
		console.log('No session, redirecting to signin');
		throw redirect(302, '/auth/signin');
	}

	console.log('Session found, loading main page');

	// For now, return minimal data to test
	return {
		session: locals.session,
		lists: [],
		profiles: [],
		existingMembers: [],
		searchResults: null,
		currentPage: 1,
		hasNextPage: false
	};
};

export const actions: Actions = {
	addToList: async () => {
		return fail(501, { error: 'Not implemented yet' });
	}
};