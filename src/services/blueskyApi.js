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
  async getAuthHeaders(session, authType = 'app_password') {
    if (authType === 'oauth') {
      // For OAuth, we need to create DPoP headers
      const oauthSession = getStoredOAuthSession();
      if (!oauthSession || !oauthSession.accessToken) {
        throw new Error('No OAuth session found');
      }

      // Generate a new DPoP keypair for this request
      const dpopKeypair = await generateDpopKeypair();

      // Create DPoP JWT for the request
      const dpopJwt = await createDpopJwt(
        dpopKeypair,
        'GET', // Most Bluesky API calls are GET
        `${BLUESKY_API}/app.bsky.graph.getLists`, // This will be overridden per request
        oauthSession.serverNonce
      );

      return {
        'Authorization': `Bearer ${oauthSession.accessToken}`,
        'DPoP': dpopJwt,
        'Content-Type': 'application/json'
      };
    } else {
      // For app password, use the standard session format
      return {
        'Authorization': `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json'
      };
    }
  }

  // Helper method to make authenticated requests directly to Bluesky
  async makeBlueskyRequest(endpoint, session, authType = 'app_password', method = 'GET', body = null) {
    const headers = await this.getAuthHeaders(session, authType);

    // For OAuth requests, we need to update the DPoP JWT for the specific endpoint
    if (authType === 'oauth' && headers.DPoP) {
      const oauthSession = getStoredOAuthSession();
      const dpopKeypair = await generateDpopKeypair();
      const dpopJwt = await createDpopJwt(
        dpopKeypair,
        method,
        `${BLUESKY_API}/${endpoint}`,
        oauthSession.serverNonce
      );
      headers.DPoP = dpopJwt;
    }

    const requestOptions = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${BLUESKY_API}/${endpoint}`, requestOptions);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to fetch from ${endpoint}`);
    }

    return await response.json();
  }

  async getUserLists(session, authType = 'app_password') {
    // For OAuth, we need to get the user's handle first
    if (authType === 'oauth') {
      const oauthSession = getStoredOAuthSession();
      if (!oauthSession.sub) {
        throw new Error('No user DID found in OAuth session');
      }

      // Get user profile to get handle
      const profile = await this.makeBlueskyRequest(
        `app.bsky.actor.getProfile?actor=${oauthSession.sub}`,
        session,
        authType
      );

      const handle = profile.handle;
      const data = await this.makeBlueskyRequest(
        `app.bsky.graph.getLists?actor=${handle}`,
        session,
        authType
      );
      return data.lists || [];
    } else {
      // App password flow
      const data = await this.makeBlueskyRequest(
        `app.bsky.graph.getLists?actor=${session.handle}`,
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
      const oauthSession = getStoredOAuthSession();
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