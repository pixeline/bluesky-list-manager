<script>
	import { listStore } from '../stores/listStore.js';
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h2 class="text-xl font-bold text-slate-800">{$listStore.selectedList?.name || 'List'}</h2>
			{#if $listStore.selectedList?.description}
				<p class="text-slate-600 mt-1">{$listStore.selectedList.description}</p>
			{/if}
		</div>
		<div class="text-right">
			<div class="text-2xl font-bold text-blue-600">
				{$listStore.selectedList?.listItemCount || 0}
			</div>
			<div class="text-sm text-slate-500">Total Members</div>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-blue-50 p-4 rounded-lg">
			<div class="text-blue-600 font-semibold">📊 List Type</div>
			<div class="text-sm text-slate-600 mt-1">
				{$listStore.selectedList?.purpose === 'app.bsky.graph.defs#modlist'
					? 'Moderation List'
					: 'Curated List'}
			</div>
		</div>

		<div class="bg-green-50 p-4 rounded-lg">
			<div class="text-green-600 font-semibold">📅 Created</div>
			<div class="text-sm text-slate-600 mt-1">
				{#if $listStore.selectedList?.createdAt}
					{new Date($listStore.selectedList.createdAt).toLocaleDateString()}
				{:else}
					Unknown
				{/if}
			</div>
		</div>

		<div class="bg-purple-50 p-4 rounded-lg">
			<div class="text-purple-600 font-semibold">🔗 List URI</div>
			<div class="text-xs text-slate-600 mt-1 break-all">
				{$listStore.selectedList?.uri || 'Not available'}
			</div>
		</div>
	</div>
</div>
