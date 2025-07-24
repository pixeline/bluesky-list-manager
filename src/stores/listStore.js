import { writable } from 'svelte/store';
import { blueskyApi } from '../services/blueskyApi.js';

const STORAGE_KEYS = {
  SELECTED_LIST: 'bluesky_selected_list',
  LISTS: 'bluesky_lists'
};

function createListStore() {
  const { subscribe, set, update } = writable({
    selectedList: null,
    userLists: [],
    listMembers: [], // This will now store the current page members only
    listMemberProfiles: [],
    isLoading: false,
    error: null
  });

  let isUpdating = false; // Flag to prevent cascading updates

  return {
    subscribe,
    setSelectedList: (list) => {
      if (list) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, JSON.stringify(list));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_LIST);
      }
      update(state => ({
        ...state,
        selectedList: list,
        isLoadingList: !!list, // Set loading to true when a list is selected
        listMembers: [], // Clear previous list members
        listMemberProfiles: [] // Clear previous list member profiles
      }));
    },
    setListLoading: (isLoading) => {
      update(state => ({ ...state, isLoadingList: isLoading }));
    },
    setUserLists: (lists) => {
      localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
      update(state => ({ ...state, userLists: lists }));
    },
    setListMembers: (members) => {
      update(state => ({ ...state, listMembers: members }));
    },
    // New method: Check if a profile is in the current list (current page only)
    isProfileInCurrentList: (profileDid) => {
      let result = false;
      update(state => {
        result = state.listMembers.includes(profileDid);
        return state;
      });
      return result;
    },
    setListMemberProfiles: (profiles) => {
      update(state => ({ ...state, listMemberProfiles: profiles }));
    },
    // New method: Add a single profile to the list without full reload
    addProfileToList: (profileDid) => {
      update(state => {
        // Add to list members if not already present
        const newListMembers = state.listMembers.includes(profileDid)
          ? state.listMembers
          : [profileDid, ...state.listMembers]; // Add to beginning for newest first

        return { ...state, listMembers: newListMembers };
      });
    },
    // New method: Add profile to displayed profiles if on current page
    addProfileToDisplay: (profile) => {
      update(state => {
        // Check if this profile should be on the current page (first 25)
        const shouldBeOnFirstPage = state.listMembers.indexOf(profile.did) < 25;

        if (shouldBeOnFirstPage) {
          // Add to beginning of displayed profiles
          const newProfiles = [profile, ...state.listMemberProfiles];
          // Keep only first 25 to match page size
          return {
            ...state,
            listMemberProfiles: newProfiles.slice(0, 25)
          };
        }

        return state;
      });
    },
    // New method: Fetch and add profile data for a single DID
    fetchAndAddProfile: (session, did, authType = 'app_password') => {
      if (isUpdating) return Promise.resolve();
      isUpdating = true;

      return new Promise(async (resolve) => {
        try {
          const profiles = await blueskyApi.getProfiles(session, [did], authType);
          if (profiles.length > 0) {
            const profile = profiles[0];

            update(state => {
              // Add to list members if not already present (current page only)
              const newListMembers = state.listMembers.includes(did)
                ? state.listMembers
                : [did, ...state.listMembers];

              // Always add to displayed profiles if we're on page 1 (first 25)
              const shouldBeOnFirstPage = newListMembers.indexOf(did) < 25;

              if (shouldBeOnFirstPage) {
                // Remove the profile if it already exists to avoid duplicates
                const filteredProfiles = state.listMemberProfiles.filter(p => p.did !== did);
                // Add to beginning of displayed profiles
                const newProfiles = [profile, ...filteredProfiles];

                return {
                  ...state,
                  listMembers: newListMembers,
                  listMemberProfiles: newProfiles.slice(0, 25)
                };
              }

              return { ...state, listMembers: newListMembers };
            });

            // Update member count in selected list and user lists
            update(state => {
              console.log('Updating member count for DID:', did);
              console.log('Current selectedList:', state.selectedList);
              console.log('Current userLists:', state.userLists);

              // Always increment the count when a profile is successfully added
              console.log('Incrementing member count for successfully added profile');

              // Update selected list member count
              const updatedSelectedList = state.selectedList ? {
                ...state.selectedList,
                listItemCount: (state.selectedList.listItemCount || 0) + 1
              } : null;

              // Update user lists member count for the current list
              const updatedUserLists = state.userLists.map(list => {
                if (list.uri === state.selectedList?.uri) {
                  return {
                    ...list,
                    memberCount: (list.memberCount || 0) + 1
                  };
                }
                return list;
              });

              console.log('Updated selectedList:', updatedSelectedList);
              console.log('Updated userLists:', updatedUserLists);

              // Update localStorage for the selected list and user lists
              if (updatedSelectedList) {
                localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, JSON.stringify(updatedSelectedList));
              }
              localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(updatedUserLists));

              return {
                ...state,
                selectedList: updatedSelectedList,
                userLists: updatedUserLists
              };
            });
          }
        } catch (error) {
          console.error('Failed to fetch profile data:', error);
          // Still add to list members even if profile fetch fails
          update(state => {
            const newListMembers = state.listMembers.includes(did)
              ? state.listMembers
              : [did, ...state.listMembers];
            return { ...state, listMembers: newListMembers };
          });

          // Update member count even if profile fetch fails
          update(state => {
            console.log('Updating member count for DID (error case):', did);

            // Always increment the count when a profile is added (even if profile fetch fails)
            console.log('Incrementing member count for profile (error case)');

            // Update selected list member count
            const updatedSelectedList = state.selectedList ? {
              ...state.selectedList,
              listItemCount: (state.selectedList.listItemCount || 0) + 1
            } : null;

            // Update user lists member count for the current list
            const updatedUserLists = state.userLists.map(list => {
              if (list.uri === state.selectedList?.uri) {
                return {
                  ...list,
                  memberCount: (list.memberCount || 0) + 1
                };
              }
              return list;
            });

            // Update localStorage for the selected list and user lists
            if (updatedSelectedList) {
              localStorage.setItem(STORAGE_KEYS.SELECTED_LIST, JSON.stringify(updatedSelectedList));
            }
            localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(updatedUserLists));

            return {
              ...state,
              selectedList: updatedSelectedList,
              userLists: updatedUserLists
            };
          });
        } finally {
          isUpdating = false;
        }
        resolve();
      });
    },


    refreshListMembers: () => {
      update(state => ({ ...state, refreshTrigger: Date.now() }));
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