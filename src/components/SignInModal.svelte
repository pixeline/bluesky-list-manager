<script>
	import { createEventDispatcher } from 'svelte';
	import { blueskyStore, AUTH_TYPES } from '../stores/blueskyStore.js';
	import { blueskyApi } from '../services/blueskyApi.js';
	import { startOAuthFlow } from '../services/oauthService.js';

	const dispatch = createEventDispatcher();

	let handle = '';
	let password = '';
	let isLoading = false;
	let error = '';
	let authMethod = 'app_password'; // 'oauth' or 'app_password'

	async function handleOAuthSignIn() {
		isLoading = true;
		error = '';

		try {
			await startOAuthFlow();
			// The page will redirect to Bluesky for authentication
			// and then return to our callback page
		} catch (err) {
			error = err.message || 'Failed to start OAuth flow';
			isLoading = false;
		}
	}

	async function handleAppPasswordSignIn() {
		if (!handle || !password) {
			error = 'Please enter both handle and password';
			return;
		}

		isLoading = true;
		error = '';

		try {
			const session = await blueskyApi.signIn(handle, password);
			blueskyStore.setSession(session, AUTH_TYPES.APP_PASSWORD);
			dispatch('close');
		} catch (err) {
			error = err.message || 'Failed to sign in. Please check your credentials.';
		} finally {
			isLoading = false;
		}
	}

	async function handleSignIn() {
		if (authMethod === 'oauth') {
			await handleOAuthSignIn();
		} else {
			await handleAppPasswordSignIn();
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
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	on:keydown={(e) => e.key === 'Escape' && handleClose()}
>
	<!-- Invisible backdrop button for accessibility -->
	<button
		class="absolute inset-0 w-full h-full bg-transparent border-0 cursor-default"
		on:click={handleBackdropClick}
		aria-label="Close modal"
		type="button"
	></button>
	<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative z-10" role="document">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xl font-semibold text-slate-800">Sign in to Bluesky</h2>
			<button on:click={handleClose} class="text-gray-400 hover:text-gray-600 text-2xl font-bold">
				×
			</button>
		</div>

		<form on:submit|preventDefault={handleSignIn}>
			<div class="space-y-4">
				<!-- Authentication Method Selection -->
				<div>
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 mb-2">Sign in with:</legend>
						<div class="space-y-2">
							<label class="flex items-center opacity-50 cursor-not-allowed">
								<input type="radio" bind:group={authMethod} value="oauth" class="mr-2" disabled />
								<span class="text-sm">OAuth (Coming Soon)</span>
							</label>
							<label class="flex items-center">
								<input type="radio" bind:group={authMethod} value="app_password" class="mr-2" />
								<span class="text-sm">App Password (Recommended)</span>
							</label>
						</div>
					</fieldset>
				</div>

				{#if authMethod === 'oauth'}
					<!-- OAuth Information -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-start">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<h3 class="text-sm font-medium text-blue-800">Secure OAuth Login</h3>
								<div class="mt-2 text-sm text-blue-700">
									<p>
										You'll be redirected to Bluesky to sign in securely. No passwords are stored on
										this site.
									</p>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<!-- App Password Fields -->
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
				{/if}

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
							{#if authMethod === 'oauth'}
								Connecting...
							{:else}
								Signing in...
							{/if}
						{:else if authMethod === 'oauth'}
							Sign in with Bluesky
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
