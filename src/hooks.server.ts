import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Get session from cookies
	const sessionCookie = event.cookies.get('bluesky-session');

	if (sessionCookie) {
		try {
			const sessionData = JSON.parse(sessionCookie);

			// Store session in locals (only serializable data)
			event.locals.session = {
				user: {
					did: sessionData.did,
					handle: sessionData.handle,
					name: sessionData.displayName,
					avatar: sessionData.avatar
				},
				accessJwt: sessionData.accessJwt,
				did: sessionData.did
			};
		} catch {
			// Invalid session, clear cookie
			event.cookies.delete('bluesky-session', { path: '/' });
		}
	}

	return resolve(event);
};