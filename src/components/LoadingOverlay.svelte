<script>
	export let isLoading = false;
	export let message = 'Loading list data...';
</script>

{#if isLoading}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
		id="loading-overlay"
	>
		<div
			class="bg-white rounded-lg p-8 shadow-xl max-w-md mx-4 text-center"
			id="loading-overlay-content"
		>
			<div class="loading-spinner mx-auto mb-4"></div>
			<h3 class="text-lg font-semibold text-slate-800 mb-2">Getting Ready</h3>
			<p class="text-slate-600">{message}</p>
		</div>
	</div>
{/if}

<style>
	.loading-spinner {
		display: inline-block;
		width: 3rem;
		height: 3rem;
		border: 4px solid #e2e8f0;
		border-top: 4px solid #475569;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
