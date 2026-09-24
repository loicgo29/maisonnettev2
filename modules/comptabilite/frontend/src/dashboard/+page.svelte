<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { API_URL } from '$lib/api';

	let invoices = [];
	let transactions = [];
	let matches = [];
	let loading = true;
	let error = null;


	onMount(async () => {
		try {
			const [invRes, txnRes, matchRes] = await Promise.all([
				axios.get(`${API_URL}/invoices`),
				axios.get(`${API_URL}/transactions`),
				axios.get(`${API_URL}/matches`)
			]);
			invoices = invRes.data.data || [];
			transactions = txnRes.data.data || [];
			matches = matchRes.data.data || [];
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	$: totalInvoices = invoices.length;
	$: totalTransactions = transactions.length;
	$: totalMatches = matches.length;
	$: unmatchedInvoices = invoices.length - (matches.filter(m => m.status === 'matched').length);
	$: totalAmountInvoices = invoices.reduce((sum, inv) => sum + inv.amount, 0);
	$: totalAmountTransactions = transactions.reduce((sum, txn) => sum + txn.amount, 0);
</script>

<svelte:head>
	<title>Dashboard — SASU</title>
</svelte:head>


<h1 class="text-3xl font-bold mb-8">Dashboard</h1>

{#if loading}
	<p class="text-gray-600">Chargement...</p>
{:else if error}
	<div class="bg-red-50 border border-red-200 p-4 rounded text-red-700">
		Erreur: {error}
	</div>
{:else}
	<!-- KPIs -->
	<div class="grid md:grid-cols-6 gap-4 mb-8">
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<p class="text-gray-600 text-sm">Factures</p>
			<p class="text-3xl font-bold">{totalInvoices}</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<p class="text-gray-600 text-sm">Transactions</p>
			<p class="text-3xl font-bold">{totalTransactions}</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<p class="text-gray-600 text-sm">Appairées</p>
			<p class="text-3xl font-bold text-green-600">{totalMatches}</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<p class="text-gray-600 text-sm">Non-appairées</p>
			<p class="text-3xl font-bold text-orange-600">{unmatchedInvoices}</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<p class="text-gray-600 text-sm">Total Factures</p>
			<p class="text-2xl font-bold">€{totalAmountInvoices.toFixed(2)}</p>
		</div>
		<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
			<p class="text-gray-600 text-sm">Total Transactions</p>
			<p class="text-2xl font-bold">€{totalAmountTransactions.toFixed(2)}</p>
		</div>
	</div>

	<!-- Recent Matches -->
	<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
		<h2 class="font-bold text-lg mb-4">Appairages Récents</h2>
		{#if matches.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="border-b">
						<tr>
							<th class="text-left py-2 px-4">Invoice ID</th>
							<th class="text-left py-2 px-4">Transaction ID</th>
							<th class="text-left py-2 px-4">Confiance</th>
							<th class="text-left py-2 px-4">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each matches.slice(0, 5) as match}
							<tr class="border-b hover:bg-gray-50">
								<td class="py-2 px-4">{match.invoiceId.slice(0, 8)}...</td>
								<td class="py-2 px-4">{match.transactionId.slice(0, 8)}...</td>
								<td class="py-2 px-4">{(match.confidence * 100).toFixed(0)}%</td>
								<td class="py-2 px-4">
									<span class="px-2 py-1 rounded text-white {match.status === 'matched' ? 'bg-green-600' : 'bg-orange-600'}">
										{match.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-gray-600">Aucun appairage pour le moment</p>
		{/if}
	</div>
{/if}
