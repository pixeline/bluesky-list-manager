const API_BASE = '/api';

class BlueskyApi {
  async signIn(handle, password) {
    const response = await fetch(`${API_BASE}/auth.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        handle: handle,
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
    const response = await fetch(`${API_BASE}/lists.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: session
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user lists');
    }

    const data = await response.json();
    return data.records || [];
  }

  async getListInfo(session, listUri) {
    const response = await fetch(`${API_BASE}/list-info.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: session,
        listUri: listUri
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch list info');
    }

    const data = await response.json();
    return data.value;
  }

  async getListMembers(session, listUri) {
    const response = await fetch(`${API_BASE}/list-members.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: session,
        listUri: listUri
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch list members');
    }

    const data = await response.json();
    return data.members || [];
  }

  async getProfiles(session, dids) {
    if (!dids || dids.length === 0) return [];

    const response = await fetch(`${API_BASE}/profiles.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: session,
        dids: dids
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profiles');
    }

    const data = await response.json();
    return data.profiles || [];
  }

  async searchProfiles(session, query, limit = 25, cursor = null) {
    const response = await fetch(`${API_BASE}/search.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: session,
        query: query,
        limit: limit,
        cursor: cursor
      })
    });

    if (!response.ok) {
      throw new Error('Failed to search profiles');
    }

    const data = await response.json();
    return {
      actors: data.actors || [],
      cursor: data.cursor
    };
  }

  async addToList(session, userDid, listUri) {
    const response = await fetch(`${API_BASE}/add-to-list.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: session,
        userDid: userDid,
        listUri: listUri
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add to list');
    }

    return await response.json();
  }

  async resolveHandle(handle) {
    const response = await fetch(`${API_BASE}/resolve-handle.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        handle: handle
      })
    });

    if (!response.ok) {
      throw new Error('Failed to resolve handle');
    }

    const data = await response.json();
    return data.did;
  }
}

export const blueskyApi = new BlueskyApi();