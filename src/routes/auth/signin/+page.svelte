<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  let isLoading = false;

  $: error = $page.url.searchParams.get("error");

  // Also check for form errors from server actions
  $: if ($page.form?.error && !error) {
    error = $page.form.error;
  }
</script>

<svelte:head>
  <title>Sign In - Bluesky Profile Catcher</title>
</svelte:head>

<div class="card" style="max-width: 400px; margin: 2rem auto;">
  <h2 style="margin-bottom: 1.5rem; text-align: center;">
    🦋 Sign In to Bluesky
  </h2>

  <p style="text-align: center; color: #6b7280; margin-bottom: 2rem;">
    Connect your Bluesky account to start building communities
  </p>

  {#if error}
    <div class="alert alert-error">
      {#if error === "invalid-credentials"}
        Invalid handle or password. Please try again.
      {:else if error === "network-error"}
        Network error. Please check your connection and try again.
      {:else}
        Authentication failed. Please try again.
      {/if}

      <!-- Debug information -->
      <details style="margin-top: 10px; font-size: 0.8em;">
        <summary>Debug Details (click to expand)</summary>
        <pre style="background: #f5f5f5; padding: 10px; margin-top: 5px; border-radius: 4px; overflow-x: auto;">{JSON.stringify($page.form || {}, null, 2)}</pre>
      </details>
    </div>
  {/if}

  <form
    method="POST"
    action="?/signin"
    use:enhance={() => {
      isLoading = true;
      console.log('Form submission started');
      return async ({ update, result }) => {
        console.log('Form submission result:', result);
        isLoading = false;
        await update();
      };
    }}
  >
    <div class="form-group">
      <label for="handle">Bluesky Handle</label>
      <input
        type="text"
        id="handle"
        name="handle"
        class="form-control"
        placeholder="your-handle.bsky.social"
        required
        disabled={isLoading}
      />
      <small style="color: #6b7280;"
        >Your Bluesky username (with or without .bsky.social)</small
      >
    </div>

    <div class="form-group">
      <label for="password">App Password</label>
      <input
        type="password"
        id="password"
        name="password"
        class="form-control"
        placeholder="abcd-efgh-ijkl-mnop"
        required
        disabled={isLoading}
      />
      <small style="color: #6b7280;">
        <a
          href="https://bsky.app/settings/app-passwords"
          target="_blank"
          style="color: #3b82f6;"
        >
          Create an app password
        </a> in your Bluesky settings
      </small>
    </div>

    <button
      type="submit"
      class="btn btn-primary"
      style="width: 100%;"
      disabled={isLoading}
    >
      {#if isLoading}
        <span
          class="spinner"
          style="width: 16px; height: 16px; margin-right: 0.5rem;"
        ></span>
        Signing in...
      {:else}
        Sign In
      {/if}
    </button>
  </form>

  <div
    style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;"
  >
    <h3 style="font-size: 1rem; margin-bottom: 1rem;">🔒 Security & Privacy</h3>
    <ul style="font-size: 0.875rem; color: #6b7280; line-height: 1.6;">
      <li>We only store your session temporarily</li>
      <li>Your password is never stored on our servers</li>
      <li>We use Bluesky's official AT Protocol APIs</li>
      <li>You can revoke access anytime in Bluesky settings</li>
    </ul>
  </div>
</div>
