<script>
	import { listStore } from '../stores/listStore.js';
	import { blueskyStore } from '../stores/blueskyStore.js';
	import { blueskyApi } from '../services/blueskyApi.js';
	import { onMount } from 'svelte';

	let stats = {
		totalMembers: 0,
		recentAdditions: 0,
		verifiedAccounts: 0,
		accountsWithAvatars: 0,
		accountsWithBios: 0,
		avgBioLength: 0,
		mostCommonWords: [],
		listAge: 0,
		accountsWithDisplayNames: 0,
		avgHandleLength: 0,
		topDomains: [],
		growthRate: 0
	};

	let isLoadingStats = false;
	let statsProgress = 0;
	let allProfiles = [];
	let statsCalculationId = null; // To prevent race conditions
	let hasCalculatedStats = false; // Track if we've already calculated stats for this list

	// Calculate basic stats from current page data immediately
	$: if ($listStore.selectedList) {
		calculateBasicStats();
	}

	// Recalculate basic stats when member count changes (e.g., after adding profiles)
	$: if ($listStore.selectedList?.listItemCount !== stats.totalMembers && !isLoadingStats) {
		console.log('ListStatistics: Member count changed, recalculating stats');
		console.log('New listItemCount:', $listStore.selectedList?.listItemCount);
		console.log('Current stats.totalMembers:', stats.totalMembers);
		calculateBasicStats();
	}

	// Track the current list URI to detect changes
	let currentListUri = null;

	// Reset stats when no list is selected
	$: if (!$listStore.selectedList && currentListUri !== null) {
		currentListUri = null;
		hasCalculatedStats = false;
		resetStats();
	}

	// Load all members and calculate comprehensive stats when list changes
	$: if (
		$listStore.selectedList &&
		$listStore.selectedList.uri !== currentListUri &&
		!isLoadingStats
	) {
		currentListUri = $listStore.selectedList.uri;
		hasCalculatedStats = false; // Reset for new list
		resetStats(); // Reset stats for new list
		loadAllMembersAndCalculateStats();
	}

	function resetStats() {
		stats = {
			totalMembers: 0,
			recentAdditions: 0,
			verifiedAccounts: 0,
			accountsWithAvatars: 0,
			accountsWithBios: 0,
			avgBioLength: 0,
			mostCommonWords: [],
			listAge: 0,
			accountsWithDisplayNames: 0,
			avgHandleLength: 0,
			topDomains: [],
			growthRate: 0
		};
		statsProgress = 0;
		allProfiles = [];
	}

	function calculateBasicStats() {
		const profiles = $listStore.listMemberProfiles || [];
		const totalMembers = $listStore.selectedList?.listItemCount || 0;

		// Calculate list age
		const createdAt = $listStore.selectedList?.createdAt;
		const listAge = createdAt
			? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
			: 0;

		// Calculate growth rate
		const growthRate = listAge > 0 ? Math.round(totalMembers / listAge) : 0;

		stats = {
			...stats,
			totalMembers,
			listAge,
			growthRate
		};
	}

	async function loadAllMembersAndCalculateStats() {
		if (!$blueskyStore.session || !$listStore.selectedList || isLoadingStats) return;

		const currentCalculationId = Date.now();
		statsCalculationId = currentCalculationId;
		isLoadingStats = true;
		statsProgress = 0;
		allProfiles = [];

		try {
			const totalMembers = $listStore.selectedList.listItemCount || 0;
			if (totalMembers === 0) {
				calculateComprehensiveStats([]);
				hasCalculatedStats = true;
				return;
			}

			// Load all members in batches
			let cursor = null;
			let batchCount = 0;
			const batchSize = 100; // Larger batches for efficiency

			do {
				batchCount++;
				statsProgress = Math.round((allProfiles.length / totalMembers) * 100);

				const result = await blueskyApi.getListMembers(
					$blueskyStore.session,
					$listStore.selectedList.uri,
					$blueskyStore.authType,
					batchSize,
					cursor
				);

				// Check if this calculation was superseded
				if (statsCalculationId !== currentCalculationId) {
					return; // Abort this calculation
				}

				allProfiles = [...allProfiles, ...result.profiles];
				cursor = result.cursor;

				// Update progress
				statsProgress = Math.round((allProfiles.length / totalMembers) * 100);
			} while (cursor && allProfiles.length < totalMembers);

			// Check if this calculation was superseded
			if (statsCalculationId !== currentCalculationId) {
				return; // Abort this calculation
			}

			// Calculate comprehensive statistics
			calculateComprehensiveStats(allProfiles);
			hasCalculatedStats = true;
		} catch (error) {
			console.error('Error loading all members for statistics:', error);
			// Fall back to basic stats if loading fails
			calculateBasicStats();
			hasCalculatedStats = true;
		} finally {
			if (statsCalculationId === currentCalculationId) {
				isLoadingStats = false;
				statsProgress = 0;
			}
		}
	}

	function calculateComprehensiveStats(profiles) {
		const totalMembers = profiles.length;

		// Basic counts
		const verifiedAccounts = profiles.filter((p) => p.verified).length;
		const accountsWithAvatars = profiles.filter((p) => p.avatar).length;
		const accountsWithBios = profiles.filter(
			(p) => p.description && p.description.trim().length > 0
		).length;
		const accountsWithDisplayNames = profiles.filter(
			(p) => p.displayName && p.displayName.trim().length > 0
		).length;

		// Calculate average bio length
		const bios = profiles.map((p) => p.description || '').filter((bio) => bio.trim().length > 0);
		const avgBioLength =
			bios.length > 0
				? Math.round(bios.reduce((sum, bio) => sum + bio.length, 0) / bios.length)
				: 0;

		// Find most common words in bios (excluding common words)
		const commonWords = [
			'the',
			'a',
			'an',
			'and',
			'or',
			'but',
			'in',
			'on',
			'at',
			'to',
			'for',
			'of',
			'with',
			'by',
			'is',
			'are',
			'was',
			'were',
			'be',
			'been',
			'have',
			'has',
			'had',
			'do',
			'does',
			'did',
			'will',
			'would',
			'could',
			'should',
			'may',
			'might',
			'can',
			'this',
			'that',
			'these',
			'those',
			'i',
			'you',
			'he',
			'she',
			'it',
			'we',
			'they',
			'me',
			'him',
			'her',
			'us',
			'them',
			'my',
			'your',
			'his',
			'her',
			'its',
			'our',
			'their',
			'mine',
			'yours',
			'his',
			'hers',
			'ours',
			'theirs'
		];

		const allWords = bios
			.join(' ')
			.toLowerCase()
			.replace(/[^\w\s]/g, '')
			.split(/\s+/)
			.filter((word) => word.length > 2 && !commonWords.includes(word));

		const wordCounts = {};
		allWords.forEach((word) => {
			wordCounts[word] = (wordCounts[word] || 0) + 1;
		});

		const mostCommonWords = Object.entries(wordCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([word, count]) => ({ word, count }));

		// Calculate average handle length
		const handles = profiles.map((p) => p.handle || '').filter((h) => h.length > 0);
		const avgHandleLength =
			handles.length > 0
				? Math.round(handles.reduce((sum, handle) => sum + handle.length, 0) / handles.length)
				: 0;

		// Find top domains from handles
		const domains = handles
			.map((handle) => {
				const parts = handle.split('.');
				return parts.length > 1 ? parts[parts.length - 1] : null;
			})
			.filter((domain) => domain && domain.length > 0);

		const domainCounts = {};
		domains.forEach((domain) => {
			domainCounts[domain] = (domainCounts[domain] || 0) + 1;
		});

		const topDomains = Object.entries(domainCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([domain, count]) => ({ domain, count }));

		// Calculate list age and growth rate
		const createdAt = $listStore.selectedList?.createdAt;
		const listAge = createdAt
			? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
			: 0;
		const growthRate = listAge > 0 ? Math.round(totalMembers / listAge) : 0;

		// Estimate recent additions (first 25 are most recent)
		const recentAdditions = Math.min(25, profiles.length);

		stats = {
			totalMembers,
			recentAdditions,
			verifiedAccounts,
			accountsWithAvatars,
			accountsWithBios,
			avgBioLength,
			mostCommonWords,
			listAge,
			accountsWithDisplayNames,
			avgHandleLength,
			topDomains,
			growthRate
		};
	}

	function getPercentage(value, total) {
		if (total === 0) return 0;
		return Math.round((value / total) * 100);
	}

	function refreshStats() {
		if (isLoadingStats) return;
		hasCalculatedStats = false; // Reset to allow recalculation
		loadAllMembersAndCalculateStats();
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6" id="list-statistics">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h2 class="text-xl font-bold text-slate-800">{$listStore.selectedList?.name || 'List'}</h2>
			{#if $listStore.selectedList?.description}
				<p class="text-slate-600 mt-1">{$listStore.selectedList.description}</p>
			{/if}
		</div>
		<div class="text-right">
			<div class="text-3xl font-bold text-blue-600">
				{stats.totalMembers.toLocaleString()}
			</div>
			<div class="text-sm text-slate-500">Total Members</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoadingStats}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
			<div class="flex items-center justify-center space-x-3">
				<div class="loading-spinner"></div>
				<div>
					<div class="text-blue-700 font-medium">Calculating comprehensive statistics...</div>
					<div class="text-blue-600 text-sm">
						Processing {allProfiles.length.toLocaleString()} of {stats.totalMembers.toLocaleString()}
						members ({statsProgress}%)
					</div>
				</div>
			</div>
			<div class="mt-3 w-full bg-blue-200 rounded-full h-2">
				<div
					class="bg-blue-600 h-2 rounded-full transition-all duration-300"
					style="width: {statsProgress}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Main Statistics Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
		<!-- Engagement Rate -->
		<div class="bg-blue-50 p-4 rounded-lg">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-blue-600 font-semibold text-sm">📊 Engagement</div>
					<div class="text-2xl font-bold text-blue-700">
						{isLoadingStats
							? '...'
							: getPercentage(stats.accountsWithBios, stats.totalMembers) + '%'}
					</div>
				</div>
				<div class="text-blue-400 text-3xl">💬</div>
			</div>
			<div class="text-xs text-blue-600 mt-1">
				{isLoadingStats ? 'Calculating...' : `${stats.accountsWithBios.toLocaleString()} have bios`}
			</div>
		</div>

		<!-- Verification Rate -->
		<div class="bg-green-50 p-4 rounded-lg">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-green-600 font-semibold text-sm">✅ Verified</div>
					<div class="text-2xl font-bold text-green-700">
						{isLoadingStats
							? '...'
							: getPercentage(stats.verifiedAccounts, stats.totalMembers) + '%'}
					</div>
				</div>
				<div class="text-green-400 text-3xl">✓</div>
			</div>
			<div class="text-xs text-green-600 mt-1">
				{isLoadingStats
					? 'Calculating...'
					: `${stats.verifiedAccounts.toLocaleString()} verified accounts`}
			</div>
		</div>

		<!-- Profile Completeness -->
		<div class="bg-purple-50 p-4 rounded-lg">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-purple-600 font-semibold text-sm">🖼️ Complete</div>
					<div class="text-2xl font-bold text-purple-700">
						{isLoadingStats
							? '...'
							: getPercentage(stats.accountsWithAvatars, stats.totalMembers) + '%'}
					</div>
				</div>
				<div class="text-purple-400 text-3xl">👤</div>
			</div>
			<div class="text-xs text-purple-600 mt-1">
				{isLoadingStats
					? 'Calculating...'
					: `${stats.accountsWithAvatars.toLocaleString()} have avatars`}
			</div>
		</div>

		<!-- List Age -->
		<div class="bg-yellow-50 p-4 rounded-lg">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-yellow-600 font-semibold text-sm">📅 Age</div>
					<div class="text-2xl font-bold text-yellow-700">
						{stats.listAge}
					</div>
				</div>
				<div class="text-yellow-400 text-3xl">📆</div>
			</div>
			<div class="text-xs text-yellow-600 mt-1">days old</div>
		</div>
	</div>

	<!-- Additional Insights -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Bio Analysis -->
		<div class="bg-gray-50 p-4 rounded-lg">
			<h3 class="text-sm font-semibold text-gray-700 mb-3">📝 Bio Analysis</h3>
			{#if isLoadingStats}
				<div class="text-gray-500 text-sm">Calculating comprehensive bio statistics...</div>
			{:else}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Average bio length:</span>
						<span class="font-medium">{stats.avgBioLength} characters</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Bios with content:</span>
						<span class="font-medium"
							>{stats.accountsWithBios.toLocaleString()} / {stats.totalMembers.toLocaleString()}</span
						>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Display names:</span>
						<span class="font-medium"
							>{stats.accountsWithDisplayNames.toLocaleString()} / {stats.totalMembers.toLocaleString()}</span
						>
					</div>
					{#if stats.mostCommonWords.length > 0}
						<div class="mt-3">
							<div class="text-xs text-gray-500 mb-2">Most common words:</div>
							<div class="flex flex-wrap gap-1">
								{#each stats.mostCommonWords as word}
									<span class="bg-white px-2 py-1 rounded text-xs border">
										{word.word} ({word.count})
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Handle Analysis -->
		<div class="bg-gray-50 p-4 rounded-lg">
			<h3 class="text-sm font-semibold text-gray-700 mb-3">🔗 Handle Analysis</h3>
			{#if isLoadingStats}
				<div class="text-gray-500 text-sm">Calculating handle statistics...</div>
			{:else}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Average handle length:</span>
						<span class="font-medium">{stats.avgHandleLength} characters</span>
					</div>
					{#if stats.topDomains.length > 0}
						<div class="mt-3">
							<div class="text-xs text-gray-500 mb-2">Top domains:</div>
							<div class="space-y-1">
								{#each stats.topDomains as domain}
									<div class="flex justify-between text-xs">
										<span class="font-medium">.{domain.domain}</span>
										<span class="text-gray-600">{domain.count} users</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- List Details -->
		<div class="bg-gray-50 p-4 rounded-lg">
			<h3 class="text-sm font-semibold text-gray-700 mb-3">📋 List Details</h3>
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">Type:</span>
					<span class="font-medium">
						{$listStore.selectedList?.purpose === 'app.bsky.graph.defs#modlist'
							? 'Moderation List'
							: 'Curated List'}
					</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">Created:</span>
					<span class="font-medium">
						{#if $listStore.selectedList?.createdAt}
							{new Date($listStore.selectedList.createdAt).toLocaleDateString()}
						{:else}
							Unknown
						{/if}
					</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">Growth rate:</span>
					<span class="font-medium">
						{stats.growthRate} members/day
					</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-gray-600">Recent activity:</span>
					<span class="font-medium">
						{isLoadingStats ? 'Calculating...' : `${stats.recentAdditions} in last batch`}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="mt-6 pt-4 border-t border-gray-200">
		<div class="flex flex-wrap gap-2">
			<button
				class="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-medium transition-colors"
				on:click={() => {
					// Extract list ID from URI (format: at://did:plc:.../app.bsky.graph.list/3kmkqahpucb2z)
					const listUri = $listStore.selectedList?.uri;
					if (listUri) {
						const uriParts = listUri.split('/');
						const listId = uriParts[uriParts.length - 1]; // Get the last part (rkey)
						const listUrl = `https://bsky.app/profile/${$blueskyStore.session?.handle}/lists/${listId}`;
						window.open(listUrl, '_blank');
					} else {
						// Fallback to general lists page if no specific list
						window.open(
							`https://bsky.app/profile/${$blueskyStore.session?.handle}/lists`,
							'_blank'
						);
					}
				}}
			>
				View on Bluesky
			</button>
			<button
				class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full text-xs font-medium transition-colors"
				on:click={refreshStats}
				disabled={isLoadingStats}
			>
				{isLoadingStats ? 'Calculating...' : 'Refresh Stats'}
			</button>
		</div>
	</div>
</div>

<style>
	.loading-spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid #e2e8f0;
		border-top: 2px solid #475569;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
