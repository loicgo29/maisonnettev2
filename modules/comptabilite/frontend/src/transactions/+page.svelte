<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { API_URL } from '$lib/api';

	let transactions = [];
	let loading = true;
	let error = null;
	let files;
	let uploading = false;
	let uploadMessage = null;


	onMount(async () => {
		await loadTransactions();
	});

	async function loadTransactions() {
		try {
			const response = await axios.get(`${API_URL}/transactions`);
			transactions = response.data.data || [];
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleUpload() {
		if (!files || files.length === 0) return;

		error = null;
		uploadMessage = null;
		uploading = true;

		const file = files[0];
		// The backend exposes a dedicated endpoint per format.
		const endpoint = /\.ofx$/i.test(file.name) ? 'upload-ofx' : 'upload-csv';

		try {
			const content = await file.text();
			const response = await axios.post(
				`${API_URL}/transactions/${endpoint}?account=Manual`,
				content,
				{ headers: { 'Content-Type': 'text/plain' } }
			);
			uploadMessage = `${response.data.created} transaction(s) importée(s) depuis ${file.name}`;
			files = null;
			await loadTransactions();
		} catch (err) {
			// Surface the backend's explanation (unparseable file, wrong format…)
			// rather than the opaque axios message.
			error = err.response?.data?.message ?? err.message;
		} finally {
			uploading = false;
		}
	}
</script>

<svelte:head>
	<title>Transactions — SASU</title>
</svelte:head>


<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Transactions</h1>
		<div class="flex gap-2">
			<input
				type="file"
				bind:files
				accept=".csv,.ofx,text/csv"
				class="px-4 py-2 border rounded"
			/>
			<button
				on:click={handleUpload}
				disabled={!files || files.length === 0 || uploading}
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
			>
				{uploading ? '⏳ Import…' : '📤 Importer (CSV / OFX)'}
			</button>
		</div>
	</div>

	{#if uploadMessage}
		<div class="bg-green-50 border border-green-200 p-4 rounded text-green-700">
			✅ {uploadMessage}
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600">Chargement...</p>
	{:else if error}
		<div class="bg-red-50 border border-red-200 p-4 rounded text-red-700">
			Erreur: {error}
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			{#if transactions.length > 0}
				<table class="w-full text-sm">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="text-left py-3 px-4">Date</th>
							<th class="text-left py-3 px-4">Description</th>
							<th class="text-right py-3 px-4">Montant</th>
							<th class="text-left py-3 px-4">Compte</th>
						</tr>
					</thead>
					<tbody>
						{#each transactions as transaction}
							<tr class="border-b hover:bg-gray-50">
								<td class="py-3 px-4">{new Date(transaction.date).toLocaleDateString('fr-FR')}</td>
								<td class="py-3 px-4">{transaction.description}</td>
								<td class="text-right py-3 px-4">€{transaction.amount.toFixed(2)}</td>
								<td class="py-3 px-4">{transaction.account}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="p-6 text-center text-gray-600">
					Aucune transaction pour le moment
				</div>
			{/if}
		</div>
	{/if}
</div>
