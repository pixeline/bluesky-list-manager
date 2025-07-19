// Bluesky AT Protocol Client

export interface BlueskyProfile {
	did: string;
	handle: string;
	displayName?: string;
	description?: string;
	avatar?: string;
}

export interface BlueskyList {
	uri: string;
	cid: string;
	name: string;
	description?: string;
	avatar?: string;
	listItemCount?: number;
	indexedAt: string;
}

export interface BlueskySession {
	did: string;
	handle: string;
	accessJwt: string;
	refreshJwt: string;
}

export interface SearchResult {
	actors: BlueskyProfile[];
	cursor?: string;
}

export class BlueskyClient {
	private baseUrl = 'https://bsky.social/xrpc';
	private accessToken?: string;
	private did?: string;

	constructor(accessToken?: string, did?: string) {
		this.accessToken = accessToken;
		this.did = did;
	}

	async login(identifier: string, password: string): Promise<BlueskySession> {
		const response = await fetch(`${this.baseUrl}/com.atproto.server.createSession`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				identifier,
				password,
			}),
		});

		if (!response.ok) {
			throw new Error(`Login failed: ${response.status}`);
		}

		const session = await response.json();
		this.accessToken = session.accessJwt;
		this.did = session.did;

		return session;
	}

	async searchActors(query: string, limit = 25, cursor?: string): Promise<SearchResult> {
		if (!this.accessToken) {
			throw new Error('Not authenticated');
		}

		const params = new URLSearchParams({
			term: query,
			limit: limit.toString(),
		});

		if (cursor) {
			params.append('cursor', cursor);
		}

		const response = await fetch(`${this.baseUrl}/app.bsky.actor.searchActors?${params}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Search failed: ${response.status}`);
		}

		return await response.json();
	}

	async getUserLists(): Promise<BlueskyList[]> {
		if (!this.accessToken || !this.did) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			`${this.baseUrl}/app.bsky.graph.getLists?actor=${this.did}&limit=100`,
			{
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch lists: ${response.status}`);
		}

		const data = await response.json();
		return data.lists || [];
	}

	async getListMembers(listUri: string): Promise<string[]> {
		if (!this.accessToken) {
			throw new Error('Not authenticated');
		}

		const members: string[] = [];
		let cursor: string | undefined;

		// Extract owner DID from list URI
		const listParts = listUri.split('/');
		const ownerDid = listParts[2];

		do {
			const params = new URLSearchParams({
				repo: ownerDid,
				collection: 'app.bsky.graph.listitem',
				limit: '100',
			});

			if (cursor) {
				params.append('cursor', cursor);
			}

			const response = await fetch(`${this.baseUrl}/com.atproto.repo.listRecords?${params}`, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch list members: ${response.status}`);
			}

			const data = await response.json();

			if (data.records) {
				for (const record of data.records) {
					if (record.value?.list === listUri && record.value?.subject) {
						members.push(record.value.subject);
					}
				}
			}

			cursor = data.cursor;
		} while (cursor);

		return members;
	}

	async addToList(userDid: string, listUri: string): Promise<boolean> {
		if (!this.accessToken || !this.did) {
			throw new Error('Not authenticated');
		}

		const record = {
			$type: 'app.bsky.graph.listitem',
			subject: userDid,
			list: listUri,
			createdAt: new Date().toISOString(),
		};

		const response = await fetch(`${this.baseUrl}/com.atproto.repo.createRecord`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.accessToken}`,
			},
			body: JSON.stringify({
				repo: this.did,
				collection: 'app.bsky.graph.listitem',
				record,
			}),
		});

		return response.ok;
	}

	async getProfile(actor: string): Promise<BlueskyProfile> {
		if (!this.accessToken) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(`${this.baseUrl}/app.bsky.actor.getProfile?actor=${actor}`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch profile: ${response.status}`);
		}

		return await response.json();
	}
}