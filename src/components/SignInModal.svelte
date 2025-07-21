<script>
  import { createEventDispatcher } from 'svelte';
  import { blueskyStore } from '../stores/blueskyStore.js';
  import { blueskyApi } from '../services/blueskyApi.js';

  const dispatch = createEventDispatcher();

  let handle = '';
  let password = '';
  let isLoading = false;
  let error = '';

  async function handleSignIn() {
    if (!handle || !password) {
      error = 'Please enter both handle and password';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const session = await blueskyApi.signIn(handle, password);
      blueskyStore.setSession(session);
      dispatch('close');
    } catch (err) {
      error = err.message || 'Failed to sign in. Please check your credentials.';
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      handleSignIn();
    } else if (event.key === 'Escape') {
      handleClose();
    }
  }

  function handleBackdropClick() {
    handleClose();
  }
</script>

<!-- Modal Backdrop -->
<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  on:click={handleBackdropClick}
  on:keydown={(e) => e.key === 'Escape' && handleClose()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
    on:click|stopPropagation
    role="document"
  >
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-slate-800">Sign in to Bluesky</h2>
      <button
        on:click={handleClose}
        class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
      >
        ×
      </button>
    </div>

    <form on:submit|preventDefault={handleSignIn}>
      <div class="space-y-4">
        <div>
          <label for="handle" class="block text-sm font-medium text-gray-700 mb-1">
            Handle
          </label>
          <input
            id="handle"
            type="text"
            bind:value={handle}
            placeholder="your-handle.bsky.social"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            App Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Your app password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            Use an app password, not your main account password
          </p>
        </div>

        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-700 text-sm">{error}</p>
          </div>
        {/if}

        <div class="flex space-x-3 pt-2">
          <button
            type="button"
            on:click={handleClose}
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {#if isLoading}
              <span class="loading-spinner mr-2"></span>
              Signing in...
            {:else}
              Sign In
            {/if}
          </button>
        </div>
      </div>
    </form>
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