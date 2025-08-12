<script>
	import { useZoomImageMove } from '@zoom-image/svelte';
	import { onMount, onDestroy } from 'svelte';

	export let src = '';
	export let alt = '';
	export let width = 'auto';
	export let height = 'auto';
	export let className = '';
	export let zoomFactor = 2;

	let imageContainer;
	let zoomImage;

	// Call the composable at the top level during component initialization
	const { createZoomImage } = useZoomImageMove();

	onMount(() => {
		if (imageContainer) {
			zoomImage = createZoomImage(imageContainer, {
				zoomFactor,
				zoomImageSource: src,
				zoomImageProps: {
					alt,
					className: 'zoom-image'
				}
			});
		}
	});

	onDestroy(() => {
		if (zoomImage && zoomImage.cleanup) {
			zoomImage.cleanup();
		}
	});
</script>

<div
	bind:this={imageContainer}
	class="zoom-image-container {className}"
	style="width: {width}; height: {height}; overflow: hidden; position: relative;"
	id="zoomable-image-{Math.random().toString(36).substr(2, 9)}"
>
	<img {src} {alt} class="base-image" style="width: 100%; height: 100%; object-fit: cover;" />
</div>

<style>
	.zoom-image-container {
		border-radius: 8px;
		cursor: move;
		user-select: none;
	}

	.base-image {
		max-width: 100%;
		height: auto;
		display: block;
	}

	.zoom-image {
		border-radius: inherit;
	}
</style>
