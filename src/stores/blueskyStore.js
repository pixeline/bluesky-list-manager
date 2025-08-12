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
      // First check for OAuth session
      const oauthSession = await getStoredOAuthSession();
      if (oauthSession && oauthSession.accessToken) {
        // Convert OAuth session to compatible format
        const session = {
          accessJwt: oauthSession.accessToken,
          refreshJwt: oauthSession.refreshToken,
          handle: oauthSession.handle || oauthSession.sub, // Use handle if available, fallback to DID
          did: oauthSession.sub,
          email: null
        };
        set({ session, authType: AUTH_TYPES.OAUTH, isLoading: false, error: null });
        return { session, authType: AUTH_TYPES.OAUTH };
      }

      // Fall back to app password session
      const { session, authType } = blueskyStore.getSession();
      if (session) {
        set({ session, authType, isLoading: false, error: null });
        return { session, authType };
      }

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