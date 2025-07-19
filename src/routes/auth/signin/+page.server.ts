import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect if already authenticated
	if (locals.session) {
		throw redirect(302, '/');
	}
};

// Simple test authentication without external client
async function authenticateWithBluesky(handle: string, password: string) {
	console.log('Making request to Bluesky API...');

	try {
		const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				identifier: handle,
				password: password,
			}),
		});

		console.log('Bluesky API response status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.log('Bluesky API error response:', errorText);
			throw new Error(`Login failed: ${response.status} - ${errorText}`);
		}

		const responseData = await response.json();
		console.log('Bluesky API success - got session data');
		return responseData;
	} catch (fetchError) {
		console.error('Fetch error:', fetchError);
		throw fetchError;
	}
}

export const actions: Actions = {
	signin: async ({ request, cookies }) => {
		console.log('Sign-in action called');

		const data = await request.formData();
		const handle = data.get('handle') as string;
		const password = data.get('password') as string;

		console.log('Handle:', handle);

		if (!handle || !password) {
			console.log('Missing handle or password');
			return fail(400, { error: 'Missing handle or password' });
		}

		try {
			console.log('Attempting Bluesky authentication...');
			const session = await authenticateWithBluesky(handle, password);
			console.log('Authentication successful');

			// Store minimal session in cookie
			const sessionData = {
				did: session.did,
				handle: session.handle,
				accessJwt: session.accessJwt,
				refreshJwt: session.refreshJwt,
			};

			cookies.set('bluesky-session', JSON.stringify(sessionData), {
				path: '/',
				httpOnly: true,
				secure: false, // Disable for testing
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30 // 30 days
			});

			console.log('Session stored, redirecting...');
			throw redirect(302, '/');

				} catch (error) {
			console.error('Authentication error details:', error);
			console.error('Error type:', typeof error);
			console.error('Error message:', error instanceof Error ? error.message : 'Unknown');

			// Check if this is a SvelteKit redirect - if so, re-throw it
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				console.log('Redirect detected, re-throwing...');
				throw error;
			}

			if (error instanceof Error) {
				if (error.message.includes('401') || error.message.includes('400')) {
					console.log('Invalid credentials error');
					return fail(401, { error: 'invalid-credentials', details: error.message });
				}

				if (error.message.includes('fetch')) {
					console.log('Network/fetch error');
					return fail(500, { error: 'network-error', details: error.message });
				}
			}

			console.log('General authentication failure');

			// Properly serialize error details
			let errorDetails = 'Unknown error';
			if (error instanceof Error) {
				errorDetails = error.message;
			} else if (typeof error === 'string') {
				errorDetails = error;
			} else if (error && typeof error === 'object') {
				errorDetails = JSON.stringify(error, null, 2);
			}

			return fail(500, {
				error: 'authentication-failed',
				details: errorDetails
			});
		}
	}
};