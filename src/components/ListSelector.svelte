<script>
  import { onMount } from 'svelte';
  import { blueskyStore } from '../stores/blueskyStore.js';
  import { listStore } from '../stores/listStore.js';
  import { blueskyApi } from '../services/blueskyApi.js';

  let isLoading = true;
  let error = '';

  onMount(async () => {
    await loadUserLists();
  });

  async function loadUserLists() {
    if (!$blueskyStore.session) return;

    isLoading = true;
    error = '';

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
      error = err.message || 'Failed to load your lists';
    } finally {
      isLoading = false;
    }
  }

  async function selectList(list) {
    try {
      // Get detailed list info
      const listInfo = await blueskyApi.getListInfo($blueskyStore.session, list.uri);
      const enhancedList = { ...list, ...listInfo };

      listStore.setSelectedList(enhancedList);
    } catch (err) {
      error = 'Failed to load list details';
    }
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold text-slate-800 mb-2">Select a List to Manage</h2>
      <p class="text-slate-600">
        Choose which of your Bluesky lists you'd like to manage and discover new profiles for.
      </p>
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-700">{error}</p>
        <button
          on:click={loadUserLists}
          class="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    {/if}

    {#if isLoading}
      <div class="text-center py-12">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-slate-600">Loading your lists...</p>
      </div>
    {:else if $listStore.userLists.length === 0}
      <div class="text-center py-12">
        <div class="text-4xl mb-4">📝</div>
        <h3 class="text-lg font-semibold text-slate-800 mb-2">No Lists Found</h3>
        <p class="text-slate-600 mb-4">
          You don't have any lists yet. Create a list on Bluesky first, then come back here to manage it.
        </p>
        <a
          href="https://bsky.app"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Go to Bluesky
        </a>
      </div>
    {:else}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each $listStore.userLists as list}
          <button
            type="button"
            class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left w-full"
            on:click={() => selectList(list)}
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-semibold text-slate-800 truncate">{list.name}</h3>
              <span class="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {list.purpose === 'app.bsky.graph.defs#modlist' ? 'Moderation' : 'Curated'}
              </span>
            </div>

            {#if list.description}
              <p class="text-sm text-slate-600 line-clamp-2 mb-3">{list.description}</p>
            {/if}

            <div class="text-xs text-slate-500">
              Created {new Date(list.createdAt).toLocaleDateString()}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .loading-spinner {
    display: inline-block;
    width: 2rem;
    height: 2rem;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #475569;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>