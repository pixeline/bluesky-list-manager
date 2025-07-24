<script>
	import { onMount } from 'svelte';
	import { listStore } from '../stores/listStore.js';

	let container;
	let butterflies = [];

	// Butterfly configuration
	const butterflyConfig = {
		baseCount: 12, // Minimum butterflies
		maxCount: 50, // Maximum butterflies
		minSize: 20,
		maxSize: 45,
		minSpeed: 15,
		maxSpeed: 45,
		minDelay: 0,
		maxDelay: 15
	};

	// Reactive butterfly count based on list members
	$: memberCount = $listStore.selectedList?.listItemCount || 0;
	$: butterflyCount = $listStore.selectedList
		? Math.min(
				butterflyConfig.maxCount,
				Math.max(butterflyConfig.baseCount, Math.floor(memberCount / 2))
			)
		: butterflyConfig.baseCount; // Show base count when no list is selected

	// Recreate butterflies when count changes
	$: if (butterflyCount !== butterflies.length) {
		createButterflies();
	}

	onMount(() => {
		createButterflies();
	});

	function createButterflies() {
		butterflies = [];
		for (let i = 0; i < butterflyCount; i++) {
			butterflies.push({
				id: i,
				x: Math.random() * 100,
				y: Math.random() * 100,
				size:
					Math.random() * (butterflyConfig.maxSize - butterflyConfig.minSize) +
					butterflyConfig.minSize,
				speed:
					Math.random() * (butterflyConfig.maxSpeed - butterflyConfig.minSpeed) +
					butterflyConfig.minSpeed,
				delay:
					Math.random() * (butterflyConfig.maxDelay - butterflyConfig.minDelay) +
					butterflyConfig.minDelay,
				rotation: Math.random() * 60 - 30, // Keep rotation between -30 and +30 degrees
				rotationSpeed: (Math.random() - 0.5) * 2,
				floatingDirection: Math.random() * 360,
				floatingSpeed: Math.random() * 0.5 + 0.1
			});
		}
	}
</script>

<div bind:this={container} class="butterfly-background" id="butterfly-background">
	{#each butterflies as butterfly (butterfly.id)}
		<div
			class="butterfly"
			style="
				left: {butterfly.x}%;
				top: {butterfly.y}%;
				width: {butterfly.size}px;
				height: {butterfly.size}px;
				animation-duration: {butterfly.speed}s;
				animation-delay: {butterfly.delay}s;
				transform: rotate({butterfly.rotation}deg);
				opacity: {0.6 + Math.random() * 0.4};
			"
		>
			<svg
				width="100%"
				height="100%"
				viewBox="0 0 600 530"
				xmlns="http://www.w3.org/2000/svg"
				class="butterfly-svg"
			>
				<path
					d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"
					fill="#1185fe"
					opacity="0.4"
				/>
			</svg>
		</div>
	{/each}

	{#if $listStore.selectedList && memberCount === 0}
		<div class="empty-list-message" id="empty-list-message">
			<div class="message-content" id="empty-list-content">
				<svg width="60" height="53" viewBox="0 0 600 530" xmlns="http://www.w3.org/2000/svg">
					<path
						d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"
						fill="#1185fe"
						opacity="0.3"
					/>
				</svg>
				<p>Add members to your list to see butterflies flutter by!</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.butterfly-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
		background: radial-gradient(ellipse at center, rgba(17, 133, 254, 0.02) 0%, transparent 70%);
	}

	.butterfly {
		position: absolute;
		animation:
			float 20s ease-in-out infinite,
			fadeIn 1s ease-out;
		transition: all 0.3s ease;
		filter: drop-shadow(0 2px 4px rgba(17, 133, 254, 0.1));
	}

	.butterfly:hover {
		filter: drop-shadow(0 4px 8px rgba(17, 133, 254, 0.2));
		transform: scale(1.1);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.5);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.butterfly-svg {
		animation:
			flutter 3s ease-in-out infinite,
			pulse 4s ease-in-out infinite;
		transform-origin: center;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.6;
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0px) translateX(0px) rotate(0deg);
		}
		20% {
			transform: translateY(-25px) translateX(15px) rotate(15deg);
		}
		40% {
			transform: translateY(-15px) translateX(-10px) rotate(-10deg);
		}
		60% {
			transform: translateY(-30px) translateX(20px) rotate(8deg);
		}
		80% {
			transform: translateY(-5px) translateX(-15px) rotate(-5deg);
		}
	}

	@keyframes flutter {
		0%,
		100% {
			transform: scale(1) rotate(0deg);
		}
		25% {
			transform: scale(1.05) rotate(5deg);
		}
		50% {
			transform: scale(0.95) rotate(-3deg);
		}
		75% {
			transform: scale(1.02) rotate(2deg);
		}
	}

	/* Different animation variations for variety */
	.butterfly:nth-child(3n) {
		animation-duration: 25s;
		animation-delay: 2s;
	}

	.butterfly:nth-child(3n + 1) {
		animation-duration: 18s;
		animation-delay: 5s;
	}

	.butterfly:nth-child(3n + 2) {
		animation-duration: 22s;
		animation-delay: 8s;
	}

	/* Empty list message */
	.empty-list-message {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		pointer-events: none;
		z-index: 1;
	}

	.message-content {
		background: rgba(255, 255, 255, 0.9);
		padding: 2rem;
		border-radius: 1rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(17, 133, 254, 0.1);
	}

	.message-content svg {
		animation: flutter 3s ease-in-out infinite;
		margin-bottom: 1rem;
	}

	.message-content p {
		color: #475569;
		font-size: 1.1rem;
		font-weight: 500;
		margin: 0;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.butterfly {
			opacity: 0.4;
		}

		.message-content {
			padding: 1.5rem;
		}

		.message-content p {
			font-size: 1rem;
		}
	}

	@media (max-width: 480px) {
		.butterfly {
			opacity: 0.3;
		}

		.message-content {
			padding: 1rem;
		}

		.message-content svg {
			width: 40px;
			height: 35px;
		}
	}
</style>
