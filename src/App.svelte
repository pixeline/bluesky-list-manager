<script>
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import AuthInstructions from './components/AuthInstructions.svelte';
  import ListSelector from './components/ListSelector.svelte';
  import ListManager from './components/ListManager.svelte';
  import { blueskyStore } from './stores/blueskyStore.js';
  import { listStore } from './stores/listStore.js';

  let currentView = 'auth'; // 'auth', 'list-selector', 'manager'

  onMount(() => {
    // Check if user is already authenticated
    const session = blueskyStore.getSession();
    if (session) {
      currentView = 'list-selector';
    }
  });

  // Watch for authentication changes
  $: if ($blueskyStore.session) {
    currentView = 'list-selector';
  } else {
    currentView = 'auth';
  }

  // Watch for list selection
  $: if ($listStore.selectedList) {
    currentView = 'manager';
  }
</script>

<main class="min-h-screen bg-gray-50">
  {#if currentView !== 'auth'}
    <Header />
  {/if}

  <div class="max-w-6xl mx-auto p-6">
    {#if currentView === 'auth'}
      <AuthInstructions />
    {:else if currentView === 'list-selector'}
      <ListSelector />
    {:else if currentView === 'manager'}
      <ListManager />
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
</style>