import { writable } from 'svelte/store';

const STORAGE_KEYS = {
  SESSION: 'bluesky_session'
};

function createBlueskyStore() {
  const { subscribe, set, update } = writable({
    session: null,
    isLoading: false,
    error: null
  });

  return {
    subscribe,
    setSession: (session) => {
      if (session) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
      set({ session, isLoading: false, error: null });
    },
    setLoading: (isLoading) => {
      update(state => ({ ...state, isLoading }));
    },
    setError: (error) => {
      update(state => ({ ...state, error, isLoading: false }));
    },
    getSession: () => {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          localStorage.removeItem(STORAGE_KEYS.SESSION);
        }
      }
      return null;
    },
    clearSession: () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      set({ session: null, isLoading: false, error: null });
    }
  };
}

export const blueskyStore = createBlueskyStore();