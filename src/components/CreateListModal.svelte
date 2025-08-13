<script>
	import { createEventDispatcher } from 'svelte';
	import { blueskyStore } from '../stores/blueskyStore.js';
	import { blueskyApi } from '../services/blueskyApi.js';
	import { listStore } from '../stores/listStore.js';

	const dispatch = createEventDispatcher();

	let name = '';
	let description = '';
	let purpose = 'app.bsky.graph.defs#curatelist';
	let isSubmitting = false;
	let error = '';

	function close() {
		dispatch('close');
	}

	async function handleSubmit() {
		error = '';
		if (!name || name.trim().length === 0) {
			error = 'Please enter a list name';
			return;
		}

		isSubmitting = true;
		try {
			const response = await blueskyApi.createList(
				$blueskyStore.session,
				{ name: name.trim(), description: description.trim(), purpose },
				$blueskyStore.authType
			);

			// Compose a minimal newList model for our store and UI
			const createdUri = response?.uri || response?.cid?.uri || null;
			const createdAt = new Date().toISOString();
			const newList = {
				uri: createdUri,
				name: name.trim(),
				description: description.trim() || '',
				purpose,
				createdAt,
				memberCount: 0
			};

			dispatch('success', newList);
			dispatch('close');
		} catch (e) {
			error = e?.message || 'Failed to create list';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
	role="dialog"
	aria-modal="true"
>
	<button
		class="absolute inset-0 w-full h-full bg-transparent border-0"
		on:click={close}
		aria-label="Close"
	></button>

	<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative z-10">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-xl font-semibold text-slate-800">Create New List</h2>
			<button on:click={close} class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
				>×</button
			>
		</div>

		<form on:submit|preventDefault={handleSubmit}>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="list-name">Name</label>
					<input
						id="list-name"
						type="text"
						bind:value={name}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="list-description"
						>Description (optional)</label
					>
					<textarea
						id="list-description"
						rows="3"
						bind:value={description}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>

				<div>
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 mb-2">Purpose</legend>
						<div class="space-y-2">
							<label class="flex items-center">
								<input
									type="radio"
									name="purpose"
									value="app.bsky.graph.defs#curatelist"
									bind:group={purpose}
									class="mr-2"
								/>
								<span class="text-sm">Curated list</span>
							</label>
							<label class="flex items-center">
								<input
									type="radio"
									name="purpose"
									value="app.bsky.graph.defs#modlist"
									bind:group={purpose}
									class="mr-2"
								/>
								<span class="text-sm">Moderation list</span>
							</label>
						</div>
					</fieldset>
				</div>

				{#if error}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
						{error}
					</div>
				{/if}

				<div class="flex space-x-3 pt-2">
					<button
						type="button"
						on:click={close}
						class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
						>Cancel</button
					>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
					>
						{#if isSubmitting}
							Creating...
						{:else}
							Create
						{/if}
					</button>
				</div>
			</div>
		</form>
	</div>
</div>

<style>
</style>
