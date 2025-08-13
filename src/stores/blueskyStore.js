import { writable } from 'svelte/store';
import { getStoredOAuthSession, clearOAuthSession } from '../services/oauthService.js';

const STORAGE_KEYS = {
  SESSION: 'bluesky_session',
  AUTH_TYPE: 'bluesky_auth_type'
};

const AUTH_TYPES = {
  OAUTH: 'oauth',
  APP_PASSWORD: 'app_password'
};

function createBlueskyStore() {
  const { subscribe, set, update } = writable({
    session: null,
    authType: null, // 'oauth' or 'app_password'
    isLoading: false,
    error: null
  });

  return {
    subscribe,
    setSession: (session, authType = AUTH_TYPES.APP_PASSWORD) => {
      if (session) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(STORAGE_KEYS.AUTH_TYPE, authType);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TYPE);
      }
      set({ session, authType, isLoading: false, error: null });
    },
    setLoading: (isLoading) => {
      update(state => ({ ...state, isLoading }));
    },
    setError: (error) => {
      update(state => ({ ...state, error, isLoading: false }));
    },
    getSession: () => {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      const authType = localStorage.getItem(STORAGE_KEYS.AUTH_TYPE) || AUTH_TYPES.APP_PASSWORD;

      if (stored) {
        try {
          return { session: JSON.parse(stored), authType };
        } catch (e) {
          localStorage.removeItem(STORAGE_KEYS.SESSION);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TYPE);
        }
      }
      return { session: null, authType: null };
    },
    clearSession: () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TYPE);
      clearOAuthSession(); // Also clear OAuth-specific storage
      set({ session: null, authType: null, isLoading: false, error: null });
    },
    signOut: () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TYPE);
      clearOAuthSession(); // Also clear OAuth-specific storage
      set({ session: null, authType: null, isLoading: false, error: null });
    },
    // Initialize session from storage (check both OAuth and app password)
    initializeSession: async () => {
      console.log('Initializing session from storage...');

      // First check for OAuth session
      const oauthSession = await getStoredOAuthSession();
      console.log('OAuth session found:', oauthSession);

      if (oauthSession && oauthSession.accessToken) {
        console.log('Converting OAuth session to compatible format...');

        // Ensure we have a proper handle (not a DID)
        let handle = oauthSession.handle;
        if (!handle || handle.startsWith('did:')) {
          console.log('OAuth session missing handle or has DID, attempting to resolve...');
          try {
            // Use the public Bluesky API endpoint for profile fetching (no auth needed)
            const profileUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${oauthSession.sub}`;
            console.log('Fetching profile from public API:', profileUrl);

            const profileResponse = await fetch(profileUrl, {
              method: 'GET',
              // No Authorization header needed for public endpoints
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData?.handle && !profileData.handle.startsWith('did:')) {
                handle = profileData.handle;
                console.log('Successfully resolved handle from profile:', handle);

                // Update the handle in the oauthSession object (in memory only)
                // Don't update localStorage as it would corrupt the DPoP keypair
                oauthSession.handle = handle;
                console.log('Updated OAuth session handle in memory (not in localStorage to preserve DPoP keypair)');
              }
            }
          } catch (error) {
            console.error('Failed to resolve handle from profile:', error);
            // Continue with the original handle/DID
          }
        }

        // Convert OAuth session to compatible format
        const session = {
          accessJwt: oauthSession.accessToken,
          refreshJwt: oauthSession.refreshToken,
          handle: handle || oauthSession.sub, // Use resolved handle or fallback to DID
          did: oauthSession.sub,
          email: null
        };
        console.log('Converted OAuth session:', session);
        set({ session, authType: AUTH_TYPES.OAUTH, isLoading: false, error: null });
        return { session, authType: AUTH_TYPES.OAUTH };
      }

      // Fall back to app password session
      const { session, authType } = blueskyStore.getSession();
      if (session) {
        console.log('Using app password session:', session);
        set({ session, authType, isLoading: false, error: null });
        return { session, authType };
      }

      console.log('No session found');
      return { session: null, authType: null };
    },
    // Check if current session is OAuth-based
    isOAuthSession: () => {
      const authType = localStorage.getItem(STORAGE_KEYS.AUTH_TYPE);
      return authType === AUTH_TYPES.OAUTH;
    }
  };
}

export const blueskyStore = createBlueskyStore();
export { AUTH_TYPES };