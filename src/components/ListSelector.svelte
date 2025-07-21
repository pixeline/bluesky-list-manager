<script>
  import { blueskyStore } from '../stores/blueskyStore.js';
  import { listStore } from '../stores/listStore.js';
</script>

<div class="max-w-4xl mx-auto">
  <div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold text-slate-800 mb-2">Welcome to Bluesky List Manager</h2>
      <p class="text-slate-600">
        Select a list from the dropdown in the header above to start managing your Bluesky lists.
      </p>
    </div>

    <div class="text-center py-12">
      <div class="text-4xl mb-4"><img src="./static/Bluesky_Logo.svg" class="w-16 h-16 mx-auto grayscale opacity-10" alt="Bluesky Logo" /></div>

      {#if $listStore.userLists.length === 0}
        <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-yellow-800 text-sm">
            <strong>No lists found:</strong> You don't have any lists yet. Create a list on Bluesky first, then come back here to manage it.
          </p>
          <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 mt-3"
          >
            Go to Bluesky
          </a>
        </div>
      {/if}
    </div>
  </div>
</div>
