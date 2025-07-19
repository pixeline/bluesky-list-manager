declare global {
	namespace App {
		interface Locals {
			session?: {
				user: {
					did: string;
					handle: string;
					name?: string;
					avatar?: string;
				};
				accessJwt: string;
				did: string;
			};
		}
		// interface PageData {}
		// interface Error {}
		// interface Platform {}
	}
}

export {};