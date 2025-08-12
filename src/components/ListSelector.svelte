<script>
	import { listStore } from '../stores/listStore.js';
	import config from '../config.js';
</script>

<div class="max-w-4xl mx-auto" id="list-selector">
	<div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200" id="list-selector-content">
		<div class="text-center mb-8">
			<h2 class="text-2xl font-bold text-slate-800 mb-2">Welcome to Bluesky List Manager</h2>
			<p class="text-slate-600">
				Select a list from the dropdown in the header above to start managing your Bluesky lists.
			</p>
		</div>

		<div class="text-center py-12">
			<div class="text-4xl mb-4">
				<img
					src={config.getAssetPath('static/Bluesky_Logo.svg')}
					class="w-16 h-16 mx-auto grayscale opacity-10"
					alt="Bluesky Logo"
				/>
			</div>

			{#if $listStore.userLists.length === 0}
				<h3 class="text-lg font-semibold text-slate-800 mb-2">No Lists Found</h3>
				<p class="text-slate-600">You don't have any lists yet. Create a list on Bluesky first!</p>
			{:else}
				<h3 class="text-lg font-semibold text-slate-800 mb-2">Select a List</h3>
				<p class="text-slate-600">Choose a list from the dropdown above to get started.</p>
			{/if}
		</div>
	</div>
</div>
