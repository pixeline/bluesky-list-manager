<script>
  import { onMount } from 'svelte';
  import { blueskyStore } from '../stores/blueskyStore.js';
  import { listStore } from '../stores/listStore.js';
  import { blueskyApi } from '../services/blueskyApi.js';
  import SignInModal from './SignInModal.svelte';

  let showSignInModal = false;
  let isLoadingLists = false;
  let listsError = '';

  onMount(async () => {
    if ($blueskyStore.session) {
      await loadUserLists();
    }
  });

  // Watch for session changes to load lists
  $: if ($blueskyStore.session && $listStore.userLists.length === 0) {
    loadUserLists();
  }

  async function loadUserLists() {
    if (!$blueskyStore.session) return;

    isLoadingLists = true;
    listsError = '';

    try {
      const records = await blueskyApi.getUserLists($blueskyStore.session);

      // Process the records to extract list information
      const lists = records
        .filter(record => record.value && record.value.$type === 'app.bsky.graph.list')
        .map(record => ({
          uri: record.uri,
          name: record.value.name,
          description: record.value.description || '',
          purpose: record.value.purpose || 'app.bsky.graph.defs#modlist',
          createdAt: record.value.createdAt
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      listStore.setUserLists(lists);
    } catch (err) {
      listsError = err.message || 'Failed to load your lists';
    } finally {
      isLoadingLists = false;
    }
  }

  async function handleListChange(event) {
    const selectedUri = event.target.value;
    if (!selectedUri) {
      listStore.clearSelectedList();
      return;
    }

    const selectedList = $listStore.userLists.find(list => list.uri === selectedUri);
    if (selectedList) {
      try {
        // Set loading state
        listStore.setListLoading(true);

        // Get detailed list info
        const listInfo = await blueskyApi.getListInfo($blueskyStore.session, selectedList.uri);
        const enhancedList = { ...selectedList, ...listInfo };

        listStore.setSelectedList(enhancedList);
      } catch (err) {
        listsError = 'Failed to load list details';
        listStore.setListLoading(false);
      }
    }
  }

  function handleSignIn() {
    showSignInModal = true;
  }

  function handleSignOut() {
    blueskyStore.clearSession();
    listStore.clearSelectedList();
  }

  function closeSignInModal() {
    showSignInModal = false;
  }
</script>

<header class="bg-white border-b border-gray-200 sticky top-0 z-50">
  <div class="max-w-6xl mx-auto px-6 py-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold m-0 text-slate-800 flex items-center gap-2">
          <img src="./static/Bluesky_Logo.svg" class="w-10 h-10" alt="Bluesky Logo" />
          Bluesky List Manager
        </h1>
        <p class="text-sm text-slate-600 m-0 mt-1">Manage members in your Bluesky lists</p>
      </div>

      <div class="flex items-center space-x-4">
        {#if $blueskyStore.session}
          <!-- List Selector Dropdown -->
          <div class="flex items-center space-x-3">
            <label class="text-sm font-medium text-slate-700 whitespace-nowrap">List:</label>
            <select
              value={$listStore.selectedList?.uri || ''}
              on:change={handleListChange}
              disabled={isLoadingLists}
              class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a list...</option>
              {#if isLoadingLists}
                <option disabled>Loading lists...</option>
              {:else if listsError}
                <option disabled>Error loading lists</option>
              {:else}
                {#each $listStore.userLists as list}
                  <option value={list.uri}>
                    {list.name}
                  </option>
                {/each}
              {/if}
            </select>
            {#if isLoadingLists}
              <div class="loading-spinner"></div>
            {/if}
          </div>

          <!-- User Info -->
          <div class="text-right">
            <div class="text-sm text-slate-700">@{$blueskyStore.session.handle}</div>
            <button
              on:click={handleSignOut}
              class="bg-gray-100 hover:bg-gray-200 text-slate-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors duration-200 font-medium"
            >
              Sign out
            </button>
          </div>
        {:else}
          <button
            on:click={handleSignIn}
            class="bg-slate-800 hover:bg-slate-700 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200"
          >
            🔐 Sign in with Bluesky
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>

{#if showSignInModal}
  <SignInModal on:close={closeSignInModal} />
{/if}

<style>
  .loading-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #475569;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>