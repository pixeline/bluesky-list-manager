<script lang="ts">
	export let data;

	$: session = data.session;
</script>

<svelte:head>
	<title>🦋 Bluesky Profile Catcher</title>
</svelte:head>

{#if !session}
	<div class="loading">
		<div class="spinner"></div>
		<p>Redirecting to sign in...</p>
	</div>
{:else}
	<div class="card">
		<h2>🎉 Authentication Successful!</h2>
		<p>Welcome to Bluesky Profile Catcher!</p>

		<div style="background: #f0f9ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
			<h3>Session Information:</h3>
			<p><strong>Handle:</strong> {session.user?.handle || 'Unknown'}</p>
			<p><strong>DID:</strong> {session.user?.did || 'Unknown'}</p>
			<p><strong>Name:</strong> {session.user?.name || 'Not set'}</p>
		</div>

		<p>🚧 <em>The search and list management features are being implemented...</em></p>

		<div style="margin-top: 2rem;">
			<a href="/auth/signout" class="btn btn-secondary">Sign Out</a>
		</div>
	</div>
{/if}
