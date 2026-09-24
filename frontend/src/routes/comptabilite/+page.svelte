<script lang="ts">
	import { onMount } from 'svelte';

	let status = 'Comptabilité — SASU';
	let apiUrl = '/api/admin/comptabilite/status';
	let apiStatus = 'checking...';

	// Test API endpoint on mount
	onMount(async () => {
		try {
			const r = await fetch(apiUrl);
			const data = await r.json();
			apiStatus = data.status === 'ok' ? 'live ✅' : 'error ❌';
		} catch {
			apiStatus = 'unreachable ❌';
		}
	});
</script>

<svelte:head>
	<title>{status}</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
	<div class="bg-white p-8 rounded-lg shadow-lg text-center">
		<h1 class="text-4xl font-bold text-blue-600 mb-4">📊 Comptabilité</h1>
		<p class="text-gray-600 mb-6">Gestion des factures et transactions (SASU)</p>
		<div class="text-6xl mb-4">✓</div>
		<p class="text-sm text-gray-500">API Status: {apiStatus}</p>
		<p class="text-xs text-gray-400 mt-2">Accès protégé (SSO Admin)</p>
	</div>
</div>
