<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { API_URL } from '$lib/api';

	let status = null;
	let logs = [];
	let loading = true;
	let syncing = false;
	let error = null;


	onMount(async () => {
		await loadStatus();
		await loadLogs();
	});

	async function loadStatus() {
		try {
			const response = await axios.get(`${API_URL}/sync/status`);
			status = response.data;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadLogs() {
		try {
			const response = await axios.get(`${API_URL}/sync/logs`);
			logs = response.data.logs || [];
		} catch (err) {
			console.error(err);
		}
	}

	async function syncPennylane() {
		syncing = true;
		try {
			await axios.post(`${API_URL}/sync/pennylane`);
			await loadStatus();
			await loadLogs();
		} catch (err) {
			error = err.message;
		} finally {
			syncing = false;
		}
	}
</script>

<svelte:head>
	<title>Synchronisation — SASU</title>
</svelte:head>


<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Synchronisation Pennylane</h1>
		<button
			on:click={syncPennylane}
			disabled={syncing}
			class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
		>
			{syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
		</button>
	</div>

	{#if loading}
		<p class="text-gray-600">Chargement...</p>
	{:else}
		<!-- Connection Status -->
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<h2 class="font-bold text-lg mb-4">Status</h2>
			<div class="space-y-2">
				<p>
					Connexion:
					<span class="font-mono {status?.status === 'connected' ? 'text-green-600' : 'text-red-600'}">
						{status?.status}
					</span>
				</p>
				{#if status?.lastSync}
					<p class="text-gray-600">
						Dernière sync: {new Date(status.lastSync.createdAt).toLocaleString('fr-FR')}
					</p>
				{/if}
			</div>
		</div>

		<!-- Sync Logs -->
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			<div class="p-6 border-b">
				<h2 class="font-bold text-lg">Historique ({logs.length})</h2>
			</div>
			{#if logs.length > 0}
				<table class="w-full text-sm">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="text-left py-3 px-4">Date</th>
							<th class="text-left py-3 px-4">Invoice</th>
							<th class="text-left py-3 px-4">Transaction</th>
							<th class="text-left py-3 px-4">Status</th>
							<th class="text-left py-3 px-4">Message</th>
						</tr>
					</thead>
					<tbody>
						{#each logs.slice(0, 10) as log}
							<tr class="border-b hover:bg-gray-50">
								<td class="py-3 px-4 text-xs">{new Date(log.createdAt).toLocaleString('fr-FR')}</td>
								<td class="py-3 px-4 text-xs">{log.invoiceId ? log.invoiceId.slice(0, 8) : '-'}...</td>
								<td class="py-3 px-4 text-xs">{log.transactionId ? log.transactionId.slice(0, 8) : '-'}...</td>
								<td class="py-3 px-4">
									<span class="px-2 py-1 rounded text-xs text-white {log.status === 'synced' ? 'bg-green-600' : 'bg-orange-600'}">
										{log.status}
									</span>
								</td>
								<td class="py-3 px-4 text-xs">{log.message}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="p-6 text-center text-gray-600">
					Aucun sync pour le moment
				</div>
			{/if}
		</div>
	{/if}
</div>
