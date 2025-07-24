<script>
	import config from '../config.js';
</script>

<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4" id="config-test">
	<h3 class="text-sm font-semibold text-blue-800 mb-2">Configuration Test</h3>
	<div class="text-xs text-blue-700 space-y-1">
		<div><strong>Environment:</strong> {config.isDevelopment ? 'Development' : 'Production'}</div>
		<div><strong>API Base:</strong> {config.apiBase}</div>
		<div><strong>Static Base:</strong> {config.staticBase}</div>
		<div><strong>Asset Path Test:</strong> {config.getAssetPath('static/Bluesky_Logo.svg')}</div>
		<div><strong>Build Time:</strong> {new Date(config.buildTime).toLocaleString()}</div>
	</div>
</div>
