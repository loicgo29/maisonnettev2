<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { HEALTH_URL } from '$lib/api';

	let healthStatus = 'checking...';
	let apiResponse = null;


	onMount(async () => {
		try {
			const response = await axios.get(HEALTH_URL);
			healthStatus = 'healthy';
			apiResponse = response.data;
		} catch (error) {
			healthStatus = 'error';
		}
	});
</script>

<svelte:head>
	<title>SASU — Automatisation comptable</title>
</svelte:head>


<div class="space-y-12">
	<!-- Hero Section -->
	<div class="text-center py-12">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">
			SASU Automation Platform
		</h1>
		<p class="text-xl text-gray-600 mb-8">
			Automatise ta gestion comptable: factures, relevés bancaires, synchronisation Pennylane
		</p>
		<div class="flex gap-4 justify-center">
			<a href="/dashboard" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
				Dashboard
			</a>
			<a href="/invoices" class="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300">
				Invoices
			</a>
		</div>
	</div>

	<!-- Features Grid -->
	<div class="grid md:grid-cols-3 gap-6">
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h3 class="font-bold text-lg mb-2">📧 Gmail Integration</h3>
			<p class="text-gray-600">Extrait automatiquement les factures de tes emails</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h3 class="font-bold text-lg mb-2">🏦 Bank Statements</h3>
			<p class="text-gray-600">Importe les relevés bancaires (CSV/OFX)</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h3 class="font-bold text-lg mb-2">🔗 Auto-Matching</h3>
			<p class="text-gray-600">Apparie automatiquement factures et paiements</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h3 class="font-bold text-lg mb-2">💰 Pennylane Sync</h3>
			<p class="text-gray-600">Synchronise vers Pennylane automatiquement</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h3 class="font-bold text-lg mb-2">📊 Dashboard</h3>
			<p class="text-gray-600">Visualise tous les pairages et syncs</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h3 class="font-bold text-lg mb-2">✅ Audit Trail</h3>
			<p class="text-gray-600">Historique complet de tous les opérations</p>
		</div>
	</div>

	<!-- Status Section -->
	<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
		<h2 class="font-bold text-lg mb-4">API Status</h2>
		<div class="space-y-2">
			<p>
				Backend Status:
				<span class="font-mono {healthStatus === 'healthy' ? 'text-green-600' : 'text-red-600'}">
					{healthStatus}
				</span>
			</p>
			{#if apiResponse}
				<p class="text-gray-600">Server uptime: {Math.round(apiResponse.uptime)}s</p>
			{/if}
		</div>
	</div>
</div>
