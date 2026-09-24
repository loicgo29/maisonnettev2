<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { API_URL } from '$lib/api';

	export let data;
	let invoices = data.invoices;
	let error = null;
	let loading = true;
	let gmailConfigured = false;
	let syncing = false;

	onMount(async () => {
		try {
			// Ask the backend what is actually usable before rendering actions.
			const [config, response] = await Promise.all([
				axios.get(`${API_URL}/config`),
				axios.get(`${API_URL}/invoices`)
			]);
			gmailConfigured = config.data.gmail === true;
			invoices = response.data.data || [];
		} catch (err) {
			error = err.response?.data?.message ?? err.message;
		} finally {
			loading = false;
		}
	});

	async function syncGmail() {
		syncing = true;
		try {
			const response = await axios.post(`${API_URL}/invoices/sync-gmail`);

			// Check if sync returned an error
			if (response.data.error) {
				error = `Gmail Sync: ${response.data.message || response.data.error}`;
				return;
			}

			// Refresh list
			const refreshResponse = await axios.get(`${API_URL}/invoices`);
			invoices = refreshResponse.data.data || [];
			error = null; // Clear error on success
		} catch (err) {
			error = `Gmail Sync Failed: ${err.response?.data?.message || err.message}`;
		} finally {
			syncing = false;
		}
	}
</script>

<svelte:head>
	<title>Factures — SASU</title>
</svelte:head>


<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Factures</h1>
		{#if gmailConfigured}
			<button
				on:click={syncGmail}
				disabled={syncing}
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
			>
				{syncing ? '⏳ Synchronisation…' : '📧 Sync Gmail'}
			</button>
		{:else}
			<!-- Offering a button whose only outcome is an error is what made this
			     screen look broken. State the situation instead. -->
			<span
				class="px-4 py-2 rounded border border-gray-300 text-gray-500 bg-gray-50 text-sm"
				title="Renseignez GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET et GMAIL_REFRESH_TOKEN, puis relancez `make docker`."
			>
				📧 Gmail non connecté
			</span>
		{/if}
	</div>

	{#if loading}
		<p class="text-gray-600">Chargement des factures...</p>
	{:else if error}
		<div class="bg-red-50 border border-red-200 p-4 rounded text-red-700">
			Erreur: {error}
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			{#if invoices.length > 0}
				<table class="w-full text-sm">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="text-left py-3 px-4">Date</th>
							<th class="text-left py-3 px-4">Vendor</th>
							<th class="text-right py-3 px-4">Montant</th>
							<th class="text-left py-3 px-4">Source</th>
							<th class="text-left py-3 px-4">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each invoices as invoice}
							<tr class="border-b hover:bg-gray-50">
								<td class="py-3 px-4">{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
								<td class="py-3 px-4">{invoice.vendor}</td>
								<td class="text-right py-3 px-4">€{invoice.amount.toFixed(2)}</td>
								<td class="py-3 px-4">
									<span class="px-2 py-1 rounded text-sm {invoice.source === 'gmail' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
										{invoice.source}
									</span>
								</td>
								<td class="py-3 px-4">
									<a href="/invoices/{invoice.id}" class="text-blue-600 hover:underline">Voir</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="p-6 text-center text-gray-600">
					Aucune facture pour le moment
				</div>
			{/if}
		</div>
	{/if}
</div>
