<script>
	export let profile;
	export let isSelected = false;
	export let onSelect = () => {};
	export let showCheckbox = true;
	export let statusTag = null;
	export let clickable = false;
	export let onAddToList = () => {};
	export let isAddingToList = false;
	export let isCheckingMembership = false; // New prop for membership checking state

	function handleSelect() {
		onSelect(profile);
	}

	function handleAddToList(event) {
		event.preventDefault();
		event.stopPropagation();
		onAddToList(profile);
	}

	function getAvatarUrl(profile) {
		if (profile.avatar) {
			return profile.avatar;
		}
		// Fallback to a default avatar or initials
		return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || profile.handle)}&background=6366f1&color=fff&size=64`;
	}

	function handleClick(event) {
		if (clickable && !showCheckbox) {
			// If clickable and no checkbox, allow the link to work
			return;
		}
		if (clickable && showCheckbox) {
			// If clickable with checkbox, prevent link click when clicking checkbox
			if (event.target.type === 'checkbox' || event.target.closest('input[type="checkbox"]')) {
				event.preventDefault();
				event.stopPropagation();
			}
		}
	}
</script>

{#if clickable}
	<a
		href="https://bsky.app/profile/{profile.handle}"
		target="_blank"
		rel="noopener noreferrer"
		class="profile-card block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200"
		on:click={handleClick}
		id="profile-card-{profile.did}"
	>
		<div class="flex items-start space-x-3">
			<!-- Profile Picture -->
			<div class="flex-shrink-0">
				<img
					src={getAvatarUrl(profile)}
					alt={profile.displayName || profile.handle}
					class="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
					onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(
						profile.displayName || profile.handle
					)}&background=6366f1&color=fff&size=64'"
				/>
			</div>

			<!-- Profile Info -->
			<div class="flex-1 min-w-0">
				<div class="flex items-center space-x-2 mb-1">
					<!-- Name -->
					<h3 class="text-base font-semibold text-gray-900 truncate">
						{profile.displayName || profile.handle}
					</h3>

					<!-- Handle -->
					<span class="text-sm text-gray-600 truncate">
						@{profile.handle}
					</span>
				</div>

				<!-- Description -->
				{#if profile.description}
					<p class="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
						{profile.description}
					</p>
				{/if}

				<!-- Status Tag or Action Buttons -->
				{#if statusTag === 'Already in list'}
					<div class="flex items-center space-x-2">
						<span
							class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
						>
							{statusTag}
						</span>
					</div>
				{:else if statusTag === 'New candidate'}
					<div class="flex items-center space-x-2">
						<span
							class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
						>
							{statusTag}
						</span>
						<button
							on:click={handleAddToList}
							disabled={isAddingToList}
							class="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border-0 cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
						>
							{#if isAddingToList}
								<span class="loading-spinner mr-1"></span>
								Adding...
							{:else}
								Add to list
							{/if}
						</button>
					</div>
				{:else if isCheckingMembership}
					<div class="flex items-center space-x-2">
						<span
							class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
						>
							<span class="loading-spinner mr-1"></span>
							Checking...
						</span>
					</div>
				{:else if showCheckbox}
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={isSelected}
							on:change={handleSelect}
							class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
						/>
						<span class="text-sm text-gray-600">Select to add to list</span>
					</div>
				{/if}
			</div>

			<!-- External Link Icon -->
			<div class="flex-shrink-0">
				<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
{:else}
	<div
		class="profile-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
		id="profile-card-{profile.did}"
	>
		<div class="flex items-start space-x-3">
			<!-- Profile Picture -->
			<div class="flex-shrink-0">
				<img
					src={getAvatarUrl(profile)}
					alt={profile.displayName || profile.handle}
					class="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
					onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(
						profile.displayName || profile.handle
					)}&background=6366f1&color=fff&size=64'"
				/>
			</div>

			<!-- Profile Info -->
			<div class="flex-1 min-w-0">
				<div class="flex items-center space-x-2 mb-1">
					<!-- Name -->
					<h3 class="text-base font-semibold text-gray-900 truncate">
						{profile.displayName || profile.handle}
					</h3>

					<!-- Handle -->
					<span class="text-sm text-gray-600 truncate">
						@{profile.handle}
					</span>
				</div>

				<!-- Description -->
				{#if profile.description}
					<p class="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
						{profile.description}
					</p>
				{/if}

				<!-- Status Tag or Action Buttons -->
				{#if statusTag === 'Already in list'}
					<div class="flex items-center space-x-2">
						<span
							class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
						>
							{statusTag}
						</span>
					</div>
				{:else if statusTag === 'New candidate'}
					<div class="flex items-center space-x-2">
						<span
							class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
						>
							{statusTag}
						</span>
						<button
							on:click={handleAddToList}
							disabled={isAddingToList}
							class="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border-0 cursor-pointer transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
						>
							{#if isAddingToList}
								<span class="loading-spinner mr-1"></span>
								Adding...
							{:else}
								Add to list
							{/if}
						</button>
					</div>
				{:else if isCheckingMembership}
					<div class="flex items-center space-x-2">
						<span
							class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
						>
							<span class="loading-spinner mr-1"></span>
							Checking...
						</span>
					</div>
				{:else if showCheckbox}
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={isSelected}
							on:change={handleSelect}
							class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
						/>
						<span class="text-sm text-gray-600">Select to add to list</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Styles for profile cards */
</style>
