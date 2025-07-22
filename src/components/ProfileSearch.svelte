<script>
	import { blueskyStore } from '../stores/blueskyStore.js';
	import { listStore } from '../stores/listStore.js';
	import { blueskyApi } from '../services/blueskyApi.js';
	import BlueskyUserProfile from './BlueskyUserProfile.svelte';
	import confetti from 'canvas-confetti';

	let searchQuery = '';
	let searchResults = [];
	let isLoading = false;
	let error = '';
	let selectedProfiles = new Set();
	let currentCursor = null;
	let hasNextPage = false;
	let addingProfiles = new Set();

	async function handleSearch() {
		if (!searchQuery.trim() || !$blueskyStore.session) return;

		isLoading = true;
		error = '';
		searchResults = [];
		selectedProfiles.clear();
		currentCursor = null;
		hasNextPage = false;

		try {
			const result = await blueskyApi.searchProfiles($blueskyStore.session, searchQuery, 25);
			searchResults = result.actors || [];
			currentCursor = result.cursor;
			hasNextPage = !!result.cursor;
		} catch (err) {
			error = err.message || 'Failed to search profiles';
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (!hasNextPage || isLoading || !$blueskyStore.session) return;

		isLoading = true;
		error = '';

		try {
			const result = await blueskyApi.searchProfiles(
				$blueskyStore.session,
				searchQuery,
				25,
				currentCursor
			);
			searchResults = [...searchResults, ...(result.actors || [])];
			currentCursor = result.cursor;
			hasNextPage = !!result.cursor;
		} catch (err) {
			error = err.message || 'Failed to load more profiles';
		} finally {
			isLoading = false;
		}
	}

	function handleProfileSelect(profile) {
		if (selectedProfiles.has(profile.did)) {
			selectedProfiles.delete(profile.did);
		} else {
			selectedProfiles.add(profile.did);
		}
		selectedProfiles = selectedProfiles; // Trigger reactivity
	}

	function isProfileInList(profileDid) {
		return $listStore.listMembers.includes(profileDid);
	}

	function getStatusTag(profile) {
		if (isProfileInList(profile.did)) {
			return 'Already in list';
		}
		return 'New candidate';
	}

	// Clear search results when selected list changes (but not on initial load)
	let previousListUri = null;
	$: if (
		$listStore.selectedList &&
		previousListUri &&
		previousListUri !== $listStore.selectedList.uri
	) {
		searchResults = [];
		selectedProfiles.clear();
		currentCursor = null;
		hasNextPage = false;
	}
	$: if ($listStore.selectedList) {
		previousListUri = $listStore.selectedList.uri;
	}

	// Reactive status tags that update when list members change
	$: profileStatusTags = searchResults.map((profile) => ({
		profile,
		status: $listStore.listMembers.includes(profile.did) ? 'Already in list' : 'New candidate'
	}));

	async function handleAddToList(profile) {
		if (!$blueskyStore.session || !$listStore.selectedList || addingProfiles.has(profile.did))
			return;

		addingProfiles.add(profile.did);
		addingProfiles = addingProfiles; // Trigger reactivity

		try {
			await blueskyApi.addToList($blueskyStore.session, profile.did, $listStore.selectedList.uri);

			// Optimized: Add to local state immediately without full reload
			await listStore.fetchAndAddProfile($blueskyStore.session, profile.did);

			// Trigger fireworks effect with blue butterfly emoji
			triggerButterflyConfetti();
		} catch (err) {
			console.error('Failed to add profile to list:', err);
			// You could show an error message here if needed
		} finally {
			addingProfiles.delete(profile.did);
			addingProfiles = addingProfiles; // Trigger reactivity
		}
	}

	function triggerButterflyConfetti() {
		// Create a beautiful butterfly-themed confetti effect
		confetti({
			particleCount: 50,
			spread: 80,
			origin: { y: 0.6 },
			colors: ['#3b82f6', '#1d4ed8', '#1e40af', '#60a5fa', '#93c5fd'], // Blue shades
			scalar: 1.5,
			ticks: 300,
			gravity: 0.6,
			drift: 0.3,
			startVelocity: 35,
			decay: 0.92,
			shapes: ['circle', 'square'],
			zIndex: 9999
		});

		// Add a second burst for more dramatic effect
		setTimeout(() => {
			confetti({
				particleCount: 30,
				spread: 60,
				origin: { y: 0.7, x: 0.3 },
				colors: ['#3b82f6', '#1d4ed8', '#60a5fa'],
				scalar: 1.2,
				ticks: 200,
				gravity: 0.7,
				drift: -0.2,
				startVelocity: 25,
				decay: 0.94
			});
		}, 150);

		// Add a third burst from the other side
		setTimeout(() => {
			confetti({
				particleCount: 30,
				spread: 60,
				origin: { y: 0.7, x: 0.7 },
				colors: ['#1e40af', '#3b82f6', '#93c5fd'],
				scalar: 1.2,
				ticks: 200,
				gravity: 0.7,
				drift: 0.2,
				startVelocity: 25,
				decay: 0.94
			});
		}, 300);
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200">
	<div class="p-6 border-b border-gray-200">
		<h3 class="text-lg font-semibold text-slate-800 mb-2">Search Profiles</h3>
		<p class="text-sm text-slate-600">
			Search for profiles by keywords in their bio, display name, or handle
		</p>
	</div>

	<div id="profile-search-container" class="p-6">
		<!-- Search Form -->
		<form on:submit|preventDefault={handleSearch} class="mb-6">
			<div class="flex gap-4 items-center flex-wrap">
				<label for="search-input" class="text-sm font-medium text-slate-700 whitespace-nowrap"
					>Search for:</label
				>
				<input
					id="search-input"
					type="text"
					bind:value={searchQuery}
					placeholder="e.g., belge, artist, developer..."
					class="flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-base outline-none shadow-sm text-slate-800 placeholder-gray-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
					required
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="bg-slate-800 hover:bg-slate-700 text-white border-0 px-6 py-2.5 rounded-lg text-base font-medium cursor-pointer transition-colors duration-200 whitespace-nowrap flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{#if isLoading}
						<span class="loading-spinner"></span>
						Searching...
					{:else}
						🔍 Search
					{/if}
				</button>
			</div>
		</form>

		<!-- Error Message -->
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
				<p class="text-red-700">{error}</p>
			</div>
		{/if}

		<!-- Search Results -->
		{#if searchResults.length > 0}
			<div class="space-y-4">
				{#each profileStatusTags as { profile, status }}
					<BlueskyUserProfile
						{profile}
						isSelected={selectedProfiles.has(profile.did)}
						onSelect={handleProfileSelect}
						statusTag={status}
						clickable={true}
						onAddToList={handleAddToList}
						isAddingToList={addingProfiles.has(profile.did)}
					/>
				{/each}

				<!-- Load More Button -->
				{#if hasNextPage}
					<div class="text-center pt-4 border-t border-gray-200">
						<button
							on:click={loadMore}
							disabled={isLoading}
							class="bg-gray-100 hover:bg-gray-200 text-slate-700 border border-gray-300 px-6 py-2.5 rounded-lg text-base font-medium cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
						>
							{#if isLoading}
								<span class="loading-spinner mr-2"></span>
								Loading...
							{:else}
								Load More Results
							{/if}
						</button>
					</div>
				{/if}
			</div>
		{:else if searchQuery && !isLoading}
			<div class="text-center py-8">
				<div>
					<div class="text-4xl mb-4">🔍</div>
					<h3 class="text-lg font-semibold text-slate-800 mb-2">No Results Found</h3>
					<p class="text-slate-600">Try different keywords or check your spelling.</p>
				</div>
			</div>
		{:else if !searchQuery}
			<div class="text-center py-8">
				<div>
					<div class="text-4xl mb-4">🔍</div>
					<h3 class="text-lg font-semibold text-slate-800 mb-2">Ready to Search</h3>
					<p class="text-slate-600">Enter keywords above to find profiles to add to your list.</p>
				</div>
			</div>
		{/if}
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
