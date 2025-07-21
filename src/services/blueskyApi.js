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

  async getUserLists(session) {
    const response = await fetch(`${BLUESKY_API}/com.atproto.repo.listRecords?repo=${session.did}&collection=app.bsky.graph.list&limit=100`, {
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user lists');
    }

    const data = await response.json();
    return data.records || [];
  }

  async getListInfo(session, listUri) {
    const listParts = listUri.split('/');
    const listOwnerDid = listParts[2];
    const listRkey = listParts[4];

    const response = await fetch(`${BLUESKY_API}/com.atproto.repo.getRecord?repo=${listOwnerDid}&collection=app.bsky.graph.list&rkey=${listRkey}`, {
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch list info');
    }

    const data = await response.json();
    return data.value;
  }

  async getListMembers(session, listUri) {
    const listParts = listUri.split('/');
    const listOwnerDid = listParts[2];

    const members = [];
    let cursor = null;

    do {
      let url = `${BLUESKY_API}/com.atproto.repo.listRecords?repo=${listOwnerDid}&collection=app.bsky.graph.listitem&limit=100`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch list members');
      }

      const data = await response.json();

      if (data.records) {
        for (const record of data.records) {
          if (record.value.list === listUri) {
            members.push(record.value.subject);
          }
        }
      }

      cursor = data.cursor;
    } while (cursor);

    return members;
  }

  async searchProfiles(session, query, limit = 25, cursor = null) {
    let url = `${BLUESKY_API}/app.bsky.actor.searchActors?term=${encodeURIComponent(query)}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to search profiles');
    }

    return await response.json();
  }

  async addToList(session, userDid, listUri) {
    const record = {
      '$type': 'app.bsky.graph.listitem',
      'subject': userDid,
      'list': listUri,
      'createdAt': new Date().toISOString()
    };

    const response = await fetch(`${BLUESKY_API}/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.graph.listitem',
        record: record
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add user to list');
    }

    return await response.json();
  }

  async resolveHandle(handle) {
    const response = await fetch(`${BLUESKY_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);

    if (!response.ok) {
      throw new Error('Failed to resolve handle');
    }

    const data = await response.json();
    return data.did;
  }
}

export const blueskyApi = new BlueskyApi();