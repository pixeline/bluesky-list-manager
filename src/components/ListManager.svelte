<script>
  import { onMount } from 'svelte';
  import { blueskyStore } from '../stores/blueskyStore.js';
  import { listStore } from '../stores/listStore.js';
  import { blueskyApi } from '../services/blueskyApi.js';
  import BlueskyUserProfile from './BlueskyUserProfile.svelte';
  import ProfileSearch from './ProfileSearch.svelte';
  import ListStatistics from './ListStatistics.svelte';

  let isLoadingMembers = true;
  let membersError = '';
  let selectedProfiles = new Set();
  let isAddingProfiles = false;
  let addResults = { success: [], errors: [] };

  onMount(async () => {
    await loadListMembers();
  });

  async function loadListMembers() {
    if (!$listStore.selectedList || !$blueskyStore.session) return;

    isLoadingMembers = true;
    membersError = '';

    try {
      const memberDids = await blueskyApi.getListMembers($blueskyStore.session, $listStore.selectedList.uri);
      listStore.setListMembers(memberDids);
    } catch (err) {
      membersError = err.message || 'Failed to load list members';
    } finally {
      isLoadingMembers = false;
    }
  }

  function handleProfileSelect(profile) {
    if (selectedProfiles.has(profile.did)) {
      selectedProfiles.delete(profile.did);
    } else {
      selectedProfiles.add(profile.did);
    }
    selectedProfiles = selectedProfiles; // Trigger reactivity
  }

  async function addSelectedToList() {
    if (selectedProfiles.size === 0) return;

    isAddingProfiles = true;
    addResults = { success: [], errors: [] };

    const profilesToAdd = Array.from(selectedProfiles);

    for (const did of profilesToAdd) {
      try {
        await blueskyApi.addToList($blueskyStore.session, did, $listStore.selectedList.uri);
        addResults.success.push(did);
      } catch (err) {
        addResults.errors.push({ did, error: err.message });
      }
    }

    // Clear selections and reload members
    selectedProfiles.clear();
    selectedProfiles = selectedProfiles; // Trigger reactivity
    await loadListMembers();

    isAddingProfiles = false;
  }

  function isProfileInList(profileDid) {
    return $listStore.listMembers.includes(profileDid);
  }
</script>

<div class="space-y-6">
  <!-- List Statistics -->
  <ListStatistics />

  <!-- Profile Search -->
  <ProfileSearch />

  <!-- Action Bar -->
  {#if selectedProfiles.size > 0}
    <div class="sticky top-20 z-40 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            on:click={addSelectedToList}
            disabled={isAddingProfiles}
            class="bg-slate-800 hover:bg-slate-700 text-white border-0 px-4 py-2.5 rounded-lg cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
          >
            {#if isAddingProfiles}
              <span class="loading-spinner mr-2"></span>
              Adding...
            {:else}
              Add {selectedProfiles.size} to List
            {/if}
          </button>
        </div>
        <div class="text-sm text-slate-600">
          {selectedProfiles.size} profiles selected
        </div>
      </div>
    </div>
  {/if}

  <!-- Results Messages -->
  {#if addResults.success.length > 0}
    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
      <p class="text-green-700 font-medium">
        ✅ Successfully added {addResults.success.length} profiles to your list!
      </p>
    </div>
  {/if}

  {#if addResults.errors.length > 0}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-700 font-medium mb-2">
        ❌ Failed to add {addResults.errors.length} profiles:
      </p>
      <ul class="text-red-600 text-sm space-y-1">
        {#each addResults.errors as error}
          <li>• {error.error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- List Members -->
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="p-6 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">Latest List Members</h3>
      <p class="text-sm text-slate-600">
        Showing the 100 most recent members of your list
      </p>
    </div>

    <div class="p-6">
      {#if isLoadingMembers}
        <div class="text-center py-12">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-slate-600">Loading list members...</p>
        </div>
      {:else if membersError}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-700">{membersError}</p>
          <button
            on:click={loadListMembers}
            class="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      {:else if $listStore.listMembers.length === 0}
        <div class="text-center py-12">
          <div class="text-4xl mb-4">📝</div>
          <h3 class="text-lg font-semibold text-slate-800 mb-2">No Members Yet</h3>
          <p class="text-slate-600">
            Your list is empty. Use the search above to find and add profiles!
          </p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each $listStore.listMembers.slice(0, 100) as memberDid}
            <!-- Note: In a real implementation, you'd need to fetch profile details for each DID -->
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span class="text-gray-600 font-medium">?</span>
                </div>
                <div class="flex-1">
                  <div class="text-sm text-gray-600">DID: {memberDid}</div>
                  <div class="text-xs text-gray-500">Member of list</div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .loading-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>