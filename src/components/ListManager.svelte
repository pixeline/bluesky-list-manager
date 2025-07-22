<script>
	import { onMount } from 'svelte';
	import { blueskyStore } from '../stores/blueskyStore.js';
	import { listStore } from '../stores/listStore.js';
	import { blueskyApi } from '../services/blueskyApi.js';
	import BlueskyUserProfile from './BlueskyUserProfile.svelte';
	import ProfileSearch from './ProfileSearch.svelte';
	import ListStatistics from './ListStatistics.svelte';

	let isLoadingMembers = true;
	let membersError = '';
	let selectedProfiles = new Set();
	let isAddingProfiles = false;
	let addResults = { success: [], errors: [] };
	let currentMembersPage = 1;
	const membersPerPage = 25;
	let isLoadingMembersPage = false;

	onMount(async () => {
		await loadListMembers();
	});

	// Watch for refresh triggers from other components
	$: if ($listStore.refreshTrigger) {
		loadListMembers();
	}

	async function loadListMembers() {
		if (!$listStore.selectedList || !$blueskyStore.session) return;

		isLoadingMembers = true;
		membersError = '';

		try {
			const memberDids = await blueskyApi.getListMembers(
				$blueskyStore.session,
				$listStore.selectedList.uri
			);
			console.log('Raw member DIDs:', memberDids);
			listStore.setListMembers(memberDids);

			// Load first page of profiles
			await loadMembersPage(1);

			// Only clear loading overlay after both members count and first page are loaded
			listStore.setListLoading(false);
		} catch (err) {
			console.error('Error loading list members:', err);
			membersError = err.message || 'Failed to load list members';
			// Clear loading overlay even on error
			listStore.setListLoading(false);
		} finally {
			isLoadingMembers = false;
		}
	}

	async function loadMembersPage(page) {
		if (!$blueskyStore.session || !$listStore.selectedList || !$listStore.listMembers.length)
			return;

		isLoadingMembersPage = true;
		currentMembersPage = page;

		try {
			const startIndex = (page - 1) * membersPerPage;
			const endIndex = startIndex + membersPerPage;
			const pageDids = $listStore.listMembers.slice(startIndex, endIndex);

			console.log(
				`Loading page ${page}: DIDs ${startIndex + 1}-${Math.min(endIndex, $listStore.listMembers.length)}`
			);
			console.log('Page DIDs:', pageDids);

			const profiles = await blueskyApi.getProfiles($blueskyStore.session, pageDids);
			console.log(`Fetched ${profiles.length} profiles for page ${page}`);
			console.log('Profiles received:', profiles);

			if (profiles.length === 0) {
				console.warn('No profiles returned from API for page', page);
				membersError = 'No profile data received from API';
			} else {
				membersError = ''; // Clear any previous errors
			}

			listStore.setListMemberProfiles(profiles);
		} catch (error) {
			console.error('Error loading members page:', error);
			membersError = error.message || 'Failed to load page';
			// Set empty profiles array to trigger fallback display
			listStore.setListMemberProfiles([]);
		} finally {
			isLoadingMembersPage = false;
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

	async function addSelectedToList() {
		if (selectedProfiles.size === 0) return;

		isAddingProfiles = true;
		addResults = { success: [], errors: [] };

		const profilesToAdd = Array.from(selectedProfiles);

		for (const did of profilesToAdd) {
			try {
				await blueskyApi.addToList($blueskyStore.session, did, $listStore.selectedList.uri);
				addResults.success.push(did);

				// Optimized: Add to local state immediately with profile data
				await listStore.fetchAndAddProfile($blueskyStore.session, did);
			} catch (err) {
				addResults.errors.push({ did, error: err.message });
			}
		}

		// Clear selections
		selectedProfiles.clear();
		selectedProfiles = selectedProfiles; // Trigger reactivity

		isAddingProfiles = false;
	}

	function isProfileInList(profileDid) {
		return $listStore.listMembers.includes(profileDid);
	}

	function getTotalPages() {
		return Math.ceil($listStore.listMembers.length / membersPerPage);
	}

	async function goToPage(page) {
		if (page >= 1 && page <= getTotalPages()) {
			await loadMembersPage(page);
		}
	}

	async function nextPage() {
		if (currentMembersPage < getTotalPages()) {
			await loadMembersPage(currentMembersPage + 1);
		}
	}

	async function prevPage() {
		if (currentMembersPage > 1) {
			await loadMembersPage(currentMembersPage - 1);
		}
	}
</script>

<div class="space-y-6">
	<!-- List Statistics -->
	<ListStatistics />

	<!-- Action Bar -->
	{#if selectedProfiles.size > 0}
		<div class="sticky top-20 z-40 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button
						on:click={addSelectedToList}
						disabled={isAddingProfiles}
						class="bg-slate-800 hover:bg-slate-700 text-white border-0 px-4 py-2.5 rounded-lg cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
					>
						{#if isAddingProfiles}
							<span class="loading-spinner mr-2"></span>
							Adding...
						{:else}
							Add {selectedProfiles.size} to List
						{/if}
					</button>
				</div>
				<div class="text-sm text-slate-600">
					{selectedProfiles.size} profiles selected
				</div>
			</div>
		</div>
	{/if}

	<!-- Results Messages -->
	{#if addResults.success.length > 0}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4">
			<p class="text-green-700 font-medium">
				✅ Successfully added {addResults.success.length} profiles to your list!
			</p>
		</div>
	{/if}

	{#if addResults.errors.length > 0}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-700 font-medium mb-2">
				❌ Failed to add {addResults.errors.length} profiles:
			</p>
			<ul class="text-red-600 text-sm space-y-1">
				{#each addResults.errors as error}
					<li>• {error.error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Two Column Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Column 1: Latest List Members -->
		<div
			id="list-members-container"
			class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col"
		>
			<div class="p-6 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-slate-800 mb-2">Latest List Members</h3>
				<p class="text-sm text-slate-600">
					Showing {isLoadingMembersPage ? '...' : $listStore.listMemberProfiles.length} of {$listStore
						.listMembers.length} total members
				</p>
			</div>

			<div class="p-6 flex flex-col flex-1">
				{#if isLoadingMembers}
					<div class="text-center py-12 flex-1 flex items-center justify-center">
						<div>
							<div class="loading-spinner mx-auto mb-4"></div>
							<p class="text-slate-600">Loading list members...</p>
						</div>
					</div>
				{:else if membersError}
					<div
						class="bg-red-50 border border-red-200 rounded-lg p-4 flex-1 flex items-center justify-center"
					>
						<div class="text-center">
							<p class="text-red-700 mb-4">{membersError}</p>
							<button on:click={loadListMembers} class="text-red-600 hover:text-red-800 underline">
								Try again
							</button>
						</div>
					</div>
				{:else if $listStore.listMembers.length === 0}
					<div class="text-center py-12 flex-1 flex items-center justify-center">
						<div>
							<div class="text-4xl mb-4">📝</div>
							<h3 class="text-lg font-semibold text-slate-800 mb-2">No Members Yet</h3>
							<p class="text-slate-600">
								Your list is empty. Use the search to find and add profiles!
							</p>
						</div>
					</div>
				{:else}
					<div class="flex flex-col flex-1">
						<div class="space-y-4 flex-1 overflow-y-auto">
							{#if isLoadingMembersPage}
								<div class="text-center py-8">
									<div class="loading-spinner mx-auto mb-4"></div>
									<p class="text-slate-600">Loading page {currentMembersPage}...</p>
								</div>
							{:else if $listStore.listMemberProfiles.length > 0}
								{#each $listStore.listMemberProfiles as profile}
									<a
										href="https://bsky.app/profile/{profile.handle}"
										target="_blank"
										rel="noopener noreferrer"
										class="block bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 hover:border-gray-300 transition-colors duration-200 cursor-pointer"
									>
										<div class="flex items-center space-x-3">
											<div class="flex-shrink-0">
												<img
													src={profile.avatar ||
														`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || profile.handle)}&background=6366f1&color=fff&size=64`}
													alt={profile.displayName || profile.handle}
													class="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
													onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(
														profile.displayName || profile.handle
													)}&background=6366f1&color=fff&size=64'"
												/>
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center space-x-2 mb-1">
													<h4 class="text-sm font-semibold text-gray-900 truncate">
														{profile.displayName || profile.handle}
													</h4>
													<span class="text-xs text-gray-600 truncate">
														@{profile.handle}
													</span>
												</div>
												{#if profile.description}
													<p class="text-xs text-gray-600 line-clamp-2">
														{profile.description}
													</p>
												{/if}
											</div>
											<div class="flex-shrink-0">
												<svg
													class="w-4 h-4 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
													></path>
												</svg>
											</div>
										</div>
									</a>
								{/each}
							{:else}
								<!-- Fallback for when profiles haven't loaded yet or failed to load -->
								{#if membersError}
									<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
										<div class="flex items-center justify-between">
											<div>
												<p class="text-yellow-800 font-medium">⚠️ Profile loading issue</p>
												<p class="text-yellow-700 text-sm mt-1">{membersError}</p>
											</div>
											<button
												on:click={() => loadMembersPage(currentMembersPage)}
												class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm font-medium transition-colors"
											>
												Retry
											</button>
										</div>
									</div>
								{/if}

								{#each $listStore.listMembers.slice(0, 100) as memberDid}
									<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
										<div class="flex items-center space-x-3">
											<div
												class="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center"
											>
												<span class="text-gray-600 font-medium">?</span>
											</div>
											<div class="flex-1">
												<div class="text-sm text-gray-600 font-mono text-xs break-all">
													{memberDid}
												</div>
												<div class="text-xs text-gray-500">Member of list</div>
											</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>

						<!-- Pagination Controls -->
						{#if $listStore.listMembers.length > membersPerPage}
							<div class="mt-6 pt-4 border-t border-gray-200">
								<div class="flex items-center justify-between">
									<div class="text-sm text-gray-600">
										Page {currentMembersPage} of {getTotalPages()}
									</div>
									<div class="flex items-center space-x-2">
										<button
											on:click={prevPage}
											disabled={currentMembersPage === 1 || isLoadingMembersPage}
											class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
										>
											{#if isLoadingMembersPage && currentMembersPage > 1}
												<span class="loading-spinner mr-1"></span>
											{/if}
											Previous
										</button>

										<!-- Page Numbers -->
										<div class="flex items-center space-x-1">
											{#each Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
												let pageNum;
												if (getTotalPages() <= 5) {
													pageNum = i + 1;
												} else if (currentMembersPage <= 3) {
													pageNum = i + 1;
												} else if (currentMembersPage >= getTotalPages() - 2) {
													pageNum = getTotalPages() - 4 + i;
												} else {
													pageNum = currentMembersPage - 2 + i;
												}
												return pageNum;
											}) as pageNum}
												<button
													on:click={() => goToPage(pageNum)}
													disabled={isLoadingMembersPage}
													class="px-3 py-1 text-sm border rounded transition-colors duration-200 {currentMembersPage ===
													pageNum
														? 'bg-blue-600 text-white border-blue-600'
														: 'border-gray-300 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{pageNum}
												</button>
											{/each}
										</div>

										<button
											on:click={nextPage}
											disabled={currentMembersPage === getTotalPages() || isLoadingMembersPage}
											class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
										>
											Next
											{#if isLoadingMembersPage && currentMembersPage < getTotalPages()}
												<span class="loading-spinner ml-1"></span>
											{/if}
										</button>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Column 2: Profile Search -->
		<div>
			<ProfileSearch />
		</div>
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

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
