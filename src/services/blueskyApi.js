import { getStoredOAuthSession, createDpopJwt, generateDpopKeypair } from './oauthService.js';

// Bluesky API base URL
const BLUESKY_API = 'https://bsky.social/xrpc';

class BlueskyApi {
  async signIn(handle, password) {
    const response = await fetch(`${BLUESKY_API}/com.atproto.server.createSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: handle,
        password: password
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to sign in');
    }

    return await response.json();
  }

  // Get authentication headers based on session type
  async getAuthHeaders(session, authType = 'app_password', method = 'GET', url = '', body = null) {
    if (authType === 'oauth') {
      const oauthSession = await getStoredOAuthSession();
      if (!oauthSession?.accessToken) throw new Error('No OAuth access token found');

      // For OAuth, use Bearer token with DPoP if needed
      const headers = {
        'Authorization': `Bearer ${oauthSession.accessToken}`
      };

      // Add DPoP header for non-GET requests or if we have a nonce
      if (method !== 'GET' || oauthSession.serverNonce) {
        try {
          const { createDpopJwt } = await import('./oauthService.js');

          // Import the DPoP keypair if it exists
          let dpopKeypair = oauthSession.dpopKeypair;
          if (dpopKeypair && typeof dpopKeypair === 'object' && dpopKeypair.privateKey) {
            // The keypair is already imported
          } else if (dpopKeypair && dpopKeypair.privateKey && dpopKeypair.publicKey) {
            // Import the JWK keys
            const privateKey = await crypto.subtle.importKey(
              'jwk',
              dpopKeypair.privateKey,
              {
                name: 'ECDSA',
                namedCurve: 'P-256'
              },
              true,
              ['sign']
            );

            const publicKey = await crypto.subtle.importKey(
              'jwk',
              dpopKeypair.publicKey,
              {
                name: 'ECDSA',
                namedCurve: 'P-256'
              },
              true,
              ['verify']
            );

            dpopKeypair = { privateKey, publicKey };
          }

          if (dpopKeypair) {
            const dpopJwt = await createDpopJwt(
              dpopKeypair,
              method,
              url,
              oauthSession.serverNonce,
              oauthSession.accessToken
            );
            headers['DPoP'] = dpopJwt;
          }
        } catch (error) {
          console.warn('Failed to create DPoP JWT for OAuth request:', error);
          // Continue without DPoP if it fails
        }
      }

      return headers;
    } else {
      // App password uses Bearer token
      return {
        'Authorization': `Bearer ${session.accessJwt}`
      };
    }
  }

  // Helper method to make authenticated requests directly to Bluesky
  async makeBlueskyRequest(endpoint, session, authType = 'app_password', method = 'GET', body = null) {
    // Determine the correct base URL based on endpoint type
    let baseUrl;
    if (authType === 'oauth') {
      // For OAuth, check if this is a public endpoint that should use public API
      const isPublicEndpoint = endpoint.includes('app.bsky.actor.getProfile') ||
                              endpoint.includes('app.bsky.actor.searchActors') ||
                              endpoint.includes('com.atproto.identity.resolveHandle') ||
                              endpoint.includes('app.bsky.graph.getLists') || // Lists endpoint is public but requires auth
                              endpoint.includes('app.bsky.graph.getList'); // Single list endpoint is also public but requires auth

      if (isPublicEndpoint) {
        // Use public API for public endpoints (auth still required for some)
        baseUrl = 'https://public.api.bsky.app/xrpc';
        console.log(`Using public API for endpoint: ${endpoint}`);
      } else {
        // Use the user's PDS for authenticated endpoints
        baseUrl = BLUESKY_API;
        console.log(`Using PDS for authenticated endpoint: ${endpoint}`);
      }
    } else {
      // App password always uses the standard API
      baseUrl = BLUESKY_API;
    }

    const url = `${baseUrl}/${endpoint}`;
    console.log(`makeBlueskyRequest: ${method} ${url} (authType: ${authType})`);

    try {
      let headers = {};

      // Only add auth headers for authenticated endpoints or when using PDS
      if (authType === 'oauth' && baseUrl.includes('bsky.social')) {
        headers = await this.getAuthHeaders(session, authType, method, url, body);
      } else if (authType === 'oauth' && baseUrl.includes('public.api.bsky.app')) {
        // For public API endpoints that still require OAuth authentication
        headers = await this.getAuthHeaders(session, authType, method, url, body);
      } else if (authType === 'app_password') {
        headers = await this.getAuthHeaders(session, authType, method, url, body);
      }

      console.log('Request headers:', headers);

      // Add Content-Type for requests with body
      if (body && method !== 'GET') {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.log('Response error:', error);

        throw new Error(error.message || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Bluesky API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getUserLists(session, authType = 'app_password') {
    console.log('getUserLists called with authType:', authType);

    if (authType === 'oauth') {
      const oauthSession = await getStoredOAuthSession();
      console.log('OAuth session for getUserLists:', oauthSession);

      if (!oauthSession?.sub) {
        console.error('OAuth session missing or invalid:', {
          hasSession: !!oauthSession,
          hasSub: !!oauthSession?.sub,
          sessionKeys: oauthSession ? Object.keys(oauthSession) : 'null'
        });
        throw new Error('No user DID found in OAuth session');
      }

      // Use handle if available, otherwise fall back to DID
      const actor = oauthSession.handle || oauthSession.sub;
      console.log('Using actor for getUserLists:', actor);

      try {
        // Use makeBlueskyRequest which now properly routes to PDS for authenticated endpoints
        const data = await this.makeBlueskyRequest(
          `app.bsky.graph.getLists?actor=${encodeURIComponent(actor)}`,
          session,
          authType
        );
        console.log('getUserLists OAuth response:', data);
        return data.lists || [];
      } catch (error) {
        console.error('Failed to fetch user lists via OAuth:', error);
        throw error;
      }
    } else {
      const data = await this.makeBlueskyRequest(
        `app.bsky.graph.getLists?actor=${encodeURIComponent(session.handle)}`,
        session,
        authType
      );
      return data.lists || [];
    }
  }

  async getListInfo(session, listUri, authType = 'app_password') {
    const data = await this.makeBlueskyRequest(
      `app.bsky.graph.getList?list=${encodeURIComponent(listUri)}`,
      session,
      authType
    );
    return data.list;
  }

  async getListMembers(session, listUri, authType = 'app_password', limit = 25, cursor = null) {
    // Use the proper Bluesky API endpoint for list members with pagination
    let url = `app.bsky.graph.getList?list=${encodeURIComponent(listUri)}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const data = await this.makeBlueskyRequest(url, session, authType);

    // Extract member DIDs and profile data from the response
    // The items array is at the root level, not nested under list
    const members = data.items || [];
    const memberDids = members.map(item => item.subject.did);
    const profiles = members.map(item => item.subject);

    return {
      members: memberDids,
      profiles: profiles,
      cursor: data.cursor,
      totalCount: data.list?.listItemCount || 0
    };
  }

  async getListMembersCount(session, listUri, authType = 'app_password') {
    // Get just the list info to get the total count without loading all members
    const listInfo = await this.getListInfo(session, listUri, authType);
    return listInfo.listItemCount || 0;
  }

  async getProfiles(session, dids, authType = 'app_password') {
    if (!dids || dids.length === 0) return [];

    const profiles = [];

    // Bluesky doesn't have a batch profile endpoint, so we need individual requests
    for (const did of dids) {
      try {
        const profile = await this.makeBlueskyRequest(
          `app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
          session,
          authType
        );
        profiles.push(profile);
      } catch (error) {
        console.error(`Failed to fetch profile for ${did}:`, error);
        // Add a placeholder profile
        profiles.push({
          did,
          handle: 'unknown',
          displayName: 'Unknown User',
          avatar: null,
          description: null
        });
      }
    }

    return profiles;
  }

  async searchProfiles(session, query, authType = 'app_password', limit = 25, cursor = null) {
    let url = `app.bsky.actor.searchActors?term=${encodeURIComponent(query)}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const data = await this.makeBlueskyRequest(url, session, authType);
    return {
      actors: data.actors || [],
      cursor: data.cursor
    };
  }

  async addToList(session, did, listUri, authType = 'app_password') {
    // For OAuth, we need to get the user's DID
    let userDid;
    if (authType === 'oauth') {
      const oauthSession = await getStoredOAuthSession();
      userDid = oauthSession.sub;
    } else {
      userDid = session.did;
    }

    const data = await this.makeBlueskyRequest(
      'com.atproto.repo.createRecord',
      session,
      authType,
      'POST',
      {
        repo: userDid,
        collection: 'app.bsky.graph.listitem',
        record: {
          '$type': 'app.bsky.graph.listitem',
          subject: did,
          list: listUri,
          createdAt: new Date().toISOString()
        }
      }
    );

    return data;
  }

  async createList(session, { name, description = '', purpose = 'app.bsky.graph.defs#curatelist' }, authType = 'app_password') {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('List name is required');
    }

    // Determine user DID
    let userDid;
    if (authType === 'oauth') {
      const oauthSession = await getStoredOAuthSession();
      userDid = oauthSession?.sub;
    } else {
      userDid = session?.did;
    }

    if (!userDid) {
      throw new Error('Unable to determine user DID for list creation');
    }

    const record = {
      '$type': 'app.bsky.graph.list',
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    if (description && typeof description === 'string') {
      record.description = description.trim();
    }

    if (purpose && typeof purpose === 'string') {
      record.purpose = purpose;
    }

    const data = await this.makeBlueskyRequest(
      'com.atproto.repo.createRecord',
      session,
      authType,
      'POST',
      {
        repo: userDid,
        collection: 'app.bsky.graph.list',
        record
      }
    );

    return data;
  }

  async removeFromList(session, did, listUri, authType = 'app_password') {
    // For OAuth, we need to get the user's DID
    let userDid;
    if (authType === 'oauth') {
      const oauthSession = await getStoredOAuthSession();
      userDid = oauthSession.sub;
    } else {
      userDid = session.did;
    }

    console.log('removeFromList: Searching for DID:', did, 'in list:', listUri, 'for user:', userDid);

    // Get all list item records from the user's repository
    let cursor = null;
    let foundRecord = null;
    let totalRecordsChecked = 0;

    do {
      const listItems = await this.makeBlueskyRequest(
        `com.atproto.repo.listRecords?repo=${userDid}&collection=app.bsky.graph.listitem&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        session,
        authType
      );

      console.log('removeFromList: Found', listItems.records?.length || 0, 'records in this batch');

      // Find the specific list item record for this DID and list
      foundRecord = listItems.records.find(record => {
        totalRecordsChecked++;
        const matches = record.value.subject === did && record.value.list === listUri;
        if (matches) {
          console.log('removeFromList: Found matching record:', record);
        }
        return matches;
      });

      if (foundRecord) {
        console.log('removeFromList: Found record with rkey:', foundRecord.rkey);
        break; // Found the record, no need to continue searching
      }

      cursor = listItems.cursor;
    } while (cursor && !foundRecord);

    console.log('removeFromList: Total records checked:', totalRecordsChecked);

    if (!foundRecord) {
      throw new Error('List item not found');
    }

    // Extract rkey from the URI (it's the last part after the last slash)
    const rkey = foundRecord.uri.split('/').pop();

    if (!rkey) {
      console.error('removeFromList: Could not extract rkey from URI:', foundRecord.uri);
      throw new Error('Could not extract rkey from URI');
    }

    console.log('removeFromList: Deleting record with rkey:', rkey);

    // Delete the record
    const data = await this.makeBlueskyRequest(
      'com.atproto.repo.deleteRecord',
      session,
      authType,
      'POST',
      {
        repo: userDid,
        collection: 'app.bsky.graph.listitem',
        rkey: rkey
      }
    );

    console.log('removeFromList: Delete successful');
    return data;
  }

  async resolveHandle(session, handle, authType = 'app_password') {
    const data = await this.makeBlueskyRequest(
      `com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      session,
      authType
    );
    return data.did;
  }
}

export const blueskyApi = new BlueskyApi();