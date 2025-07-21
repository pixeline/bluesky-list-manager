<script>
  import SignInModal from './SignInModal.svelte';

  let showSignInModal = false;

  function handleSignIn() {
    showSignInModal = true;
  }

  function closeSignInModal() {
    showSignInModal = false;
  }
</script>

<div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
  <div class="text-center mb-8">
    <div class="text-6xl mb-4"><img src="./static/Bluesky_Logo.svg" class="w-16 h-16 mx-auto" alt="Bluesky Logo" /></div>
    <h2 class="text-3xl font-bold text-slate-800 mb-4">Welcome to Bluesky List Manager</h2>
    <p class="text-lg text-slate-600 mb-6">
      Manage your Bluesky lists with ease
    </p>
  </div>

  <div class="space-y-6">
    <div class="bg-blue-50 p-6 rounded-lg border border-blue-200">
      <h3 class="text-lg font-semibold text-blue-800 mb-3">🔍 What you can do:</h3>
      <ul class="space-y-2 text-blue-700">
        <li class="flex items-start">
          <span class="text-blue-500 mr-2">•</span>
          <span><strong>Search profiles</strong> by keywords in their bio, display name, or handle</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-500 mr-2">•</span>
          <span><strong>Check if profiles</strong> are already in your selected list</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-500 mr-2">•</span>
          <span><strong>Add multiple profiles</strong> to your lists with one click</span>
        </li>
        <li class="flex items-start">
          <span class="text-blue-500 mr-2">•</span>
          <span><strong>View and manage</strong> your existing list members</span>
        </li>
      </ul>
    </div>

    <div class="bg-green-50 p-6 rounded-lg border border-green-200">
      <h3 class="text-lg font-semibold text-green-800 mb-3">🔐 Privacy & Security</h3>
      <p class="text-green-700 mb-3">
        This app is a client-side application. Your Bluesky credentials are stored locally in your browser and are never sent to our servers.
        We only communicate directly with Bluesky's API using your authentication token.
      </p>
      <p class="text-sm text-green-600">
        <strong>Your data stays private and secure.</strong> Feel free to inspect the source code (and contribute!) on <a href="https://github.com/pixeline/bluesky-profile-catcher" class="text-green-600 hover:text-green-700 underline">GitHub</a>.
      </p>
    </div>

    <div class="text-center">
      <button
        on:click={handleSignIn}
        class="bg-slate-800 hover:bg-slate-700 text-white border-0 px-8 py-3 rounded-lg text-lg font-medium cursor-pointer transition-colors duration-200"
      >
        🔐 Get Started - Sign in with Bluesky
      </button>
    </div>
  </div>
</div>

{#if showSignInModal}
  <SignInModal on:close={closeSignInModal} />
{/if}