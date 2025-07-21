<script>
  import { blueskyStore } from '../stores/blueskyStore.js';
  import { listStore } from '../stores/listStore.js';
  import SignInModal from './SignInModal.svelte';

  let showSignInModal = false;

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
        <h1 class="text-2xl font-bold m-0 text-slate-800">🦋 Bluesky List Manager</h1>
        <p class="text-sm text-slate-600 m-0 mt-1">Find and manage profiles in your Bluesky lists</p>
      </div>

      <div class="flex items-center space-x-4">
        {#if $blueskyStore.session}
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