<script>
	import config from '../config.js';
	import SignInModal from './SignInModal.svelte';
	import ZoomableImage from './ZoomableImage.svelte';

	let showSignInModal = false;

	function handleSignIn() {
		showSignInModal = true;
	}

	function closeSignInModal() {
		showSignInModal = false;
	}
</script>

<div
	class="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto relative z-100"
	id="auth-instructions"
>
	<div class="text-center mb-8">
		<div class="text-6xl mb-4">
			<img
				src={config.getAssetPath('static/Bluesky_Logo.svg')}
				class="w-16 h-16 mx-auto"
				alt="Bluesky Logo"
			/>
		</div>
		<h2 class="text-4xl font-bold text-slate-800 mb-4">Bluesky List Manager</h2>
		<p class="text-xl text-slate-600 mb-2">Manage your lists like a pro.</p>
		<p class="text-xl text-slate-600 mb-6">
			<strong class="text-blue-600"
				>Get insights and powerful tools to grow your curated lists.</strong
			>
		</p>
	</div>

	<!-- CTA Above Image -->
	<div class="text-center mb-8" id="auth-cta">
		<button
			on:click={handleSignIn}
			class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 rounded-lg text-xl font-medium cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
			id="auth-sign-in-button"
		>
			🚀 Sign in with Bluesky to manage your lists
		</button>
		<p class="text-sm text-gray-500 mt-3">
			100% free • No registration required • Works instantly • Zero data stored on our servers
		</p>
	</div>

	<!-- Preview Image with Zoom Effect -->
	<div class="mb-8 text-center">
		<div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
			<div class="screenshot-container">
				<ZoomableImage
					src={config.getAssetPath('static/screencapture.png')}
					alt="Bluesky List Manager Preview - Showing list statistics and member management interface"
					width="100%"
					height="auto"
					className="screenshot-zoom-image"
					zoomFactor={3}
				/>
				<div class="zoom-overlay">
					<div class="zoom-hint">🔍 Move mouse to zoom and explore the interface</div>
				</div>
			</div>
			<p class="text-sm text-gray-600 mt-4">
				See your list insights and manage members with powerful analytics
			</p>
		</div>
	</div>

	<div class="grid md:grid-cols-2 gap-8 mb-8">
		<!-- The Problem -->
		<div class="bg-red-50 p-6 rounded-lg border border-red-200">
			<h3 class="text-lg font-semibold text-red-800 mb-3">😤 The Manual Way (Slow & Painful)</h3>
			<ul class="space-y-2 text-red-700">
				<li class="flex items-start">
					<span class="text-red-500 mr-2">•</span>
					<span>Search one profile at a time</span>
				</li>

				<li class="flex items-start">
					<span class="text-red-500 mr-2">•</span>
					<span>Forget who you've already added</span>
				</li>
				<li class="flex items-start">
					<span class="text-red-500 mr-2">•</span>
					<span>Hours of repetitive clicking</span>
				</li>
			</ul>
		</div>

		<!-- The Solution -->
		<div class="bg-green-50 p-6 rounded-lg border border-green-200">
			<h3 class="text-lg font-semibold text-green-800 mb-3">⚡ The Smart Way (Fast & Easy)</h3>
			<ul class="space-y-2 text-green-700">
				<li class="flex items-start">
					<span class="text-green-500 mr-2">•</span>
					<span><strong>Bulk search</strong> by keywords, bio, or handle</span>
				</li>
				<li class="flex items-start">
					<span class="text-green-500 mr-2">•</span>
					<span><strong>Instant filtering</strong> - see who's already in your list</span>
				</li>
				<li class="flex items-start">
					<span class="text-green-500 mr-2">•</span>
					<span><strong>Minutes instead of hours</strong></span>
				</li>
			</ul>
		</div>
	</div>

	<!-- Use Cases -->
	<div class="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8">
		<h3 class="text-lg font-semibold text-blue-800 mb-4">🎯 Perfect for:</h3>
		<div class="grid md:grid-cols-3 gap-4 text-blue-700">
			<div class="text-center">
				<div class="text-2xl mb-2">👥</div>
				<div class="font-medium">Community Builders</div>
				<div class="text-sm">Grow your curated lists quickly</div>
			</div>
			<div class="text-center">
				<div class="text-2xl mb-2">🔍</div>
				<div class="font-medium">Content Creators</div>
				<div class="text-sm">Find your target audience</div>
			</div>
			<div class="text-center">
				<div class="text-2xl mb-2">📊</div>
				<div class="font-medium">List Managers</div>
				<div class="text-sm">Maintain and expand your lists</div>
			</div>
		</div>
	</div>

	<!-- Key Features -->
	<div class="bg-purple-50 p-6 rounded-lg border border-purple-200 mb-8">
		<h3 class="text-lg font-semibold text-purple-800 mb-3">✨ Key Features</h3>
		<div class="grid md:grid-cols-2 gap-4 text-purple-700">
			<div>
				<div class="font-medium mb-1">🔍 Smart Search</div>
				<div class="text-sm">
					Search across bios, display names, and handles with powerful filters
				</div>
			</div>
			<div>
				<div class="font-medium mb-1">📊 Real-time Stats</div>
				<div class="text-sm">See engagement rates, verification status, and growth metrics</div>
			</div>

			<div>
				<div class="font-medium mb-1">🔒 Privacy First</div>
				<div class="text-sm">Client-side app - your data never leaves your browser</div>
			</div>
		</div>
	</div>

	<!-- Privacy & Security -->
	<div class="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
		<h3 class="text-lg font-semibold text-gray-800 mb-3">🔐 Privacy & Security</h3>
		<p class="text-gray-700 mb-3">
			This is a <strong>client-side application</strong>. Your Bluesky credentials are stored
			locally in your browser and are never sent to our servers. We only communicate directly with
			Bluesky's API using your authentication token.
		</p>
		<p class="text-sm text-gray-600">
			<strong>Your data stays private and secure.</strong> Feel free to inspect the source code (and
			contribute!) on
			<a
				href="https://github.com/pixeline/bluesky-profile-catcher"
				class="text-gray-600 hover:text-gray-700 underline">GitHub</a
			>.
		</p>
	</div>

	<div class="text-center">
		<button
			on:click={handleSignIn}
			class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 rounded-lg text-xl font-medium cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
		>
			🚀 Start Building Better Lists - Sign in with Bluesky
		</button>
		<p class="text-sm text-gray-500 mt-3">
			100% free • No registration required • Works instantly • Zero data stored on our servers
		</p>
	</div>
</div>

{#if showSignInModal}
	<SignInModal on:close={closeSignInModal} />
{/if}

<style>
	.screenshot-container {
		position: relative;
		overflow: hidden;
		border-radius: 0.5rem;
	}

	.zoom-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.1);
		opacity: 1;
		transition: opacity 0.3s ease-in-out;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.screenshot-container:hover .zoom-overlay {
		opacity: 0;
	}

	.zoom-hint {
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 2rem;
		font-size: 0.875rem;
		font-weight: 500;
		backdrop-filter: blur(4px);
		transform: translateY(0);
		transition: transform 0.3s ease-in-out;
	}

	.screenshot-container:hover .zoom-hint {
		transform: translateY(20px);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.zoom-hint {
			font-size: 0.75rem;
			padding: 0.5rem 1rem;
		}
	}

	/* Smooth scrolling for better UX */
	.screenshot-container {
		scroll-behavior: smooth;
	}
</style>
