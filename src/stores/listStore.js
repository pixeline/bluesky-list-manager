import { writable } from 'svelte/store';

const STORAGE_KEYS = {
  SELECTED_LIST: 'bluesky_selected_list',
  LISTS: 'bluesky_lists'
};

function createListStore() {
  const { subscribe, set, update } = writable({
    selectedList: null,
    userLists: [],
    listMembers: [],
    isLoading: false,
    error: null
  });

  return {
    subscribe,
    setSelectedList: (list) => {
      if (list) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, JSON.stringify(list));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
      }
      update(state => ({ ...state, selectedList: list }));
    },
    setUserLists: (lists) => {
      localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
      update(state => ({ ...state, userLists: lists }));
    },
    setListMembers: (members) => {
      update(state => ({ ...state, listMembers: members }));
    },
    setLoading: (isLoading) => {
      update(state => ({ ...state, isLoading }));
    },
    setError: (error) => {
      update(state => ({ ...state, error, isLoading: false }));
    },
    getSelectedList: () => {
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_LIST);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
        }
      }
      return null;
    },
    getUserLists: () => {
      const stored = localStorage.getItem(STORAGE_KEYS.LISTS);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          localStorage.removeItem(STORAGE_KEYS.LISTS);
        }
      }
      return [];
    },
    clearSelectedList: () => {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
      update(state => ({ ...state, selectedList: null }));
    }
  };
}

export const listStore = createListStore();