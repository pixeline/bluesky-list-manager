<script lang="ts">
  import "../app.css";
  
  export let data;
  
  $: session = data.session;
</script>

<svelte:head>
  <title>🦋 Bluesky Profile Catcher</title>
</svelte:head>

<header class="header">
  <div class="container">
    <h1>🦋 Bluesky Profile Catcher</h1>
    <p>Build targeted communities by catching the right profiles</p>

    {#if session}
      <div
        style="margin-top: 1rem; display: flex; align-items: center; gap: 1rem;"
      >
        {#if session.user?.avatar}
          <img
            src={session.user.avatar}
            alt="Avatar"
            class="avatar"
            style="width: 32px; height: 32px;"
          />
        {/if}
        <span>Welcome, {session.user?.name || session.user?.handle}</span>
        <a
          href="/auth/signout"
          class="btn btn-secondary"
          style="margin-left: auto;">Sign Out</a
        >
      </div>
    {/if}
  </div>
</header>

<main class="main">
  <div class="container">
    <slot />
  </div>
</main>

<footer
  style="text-align: center; padding: 2rem; color: #6b7280; border-top: 1px solid #e5e7eb;"
>
  <p>Made with ❤️ for the Bluesky community 🦋</p>
  <p><em>Catch profiles, build communities, spread your wings</em></p>
</footer>
