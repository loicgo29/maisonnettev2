<script>
	import { onMount } from 'svelte';
	import axios from 'axios';
	import { API_URL } from '$lib/api';

	let summary = {};
	let matches = [];
	let unmatchedInvoices = [];
	let unmatchedTransactions = [];
	let loading = true;
	let error = null;

	onMount(async () => {
		try {
			const response = await axios.get(`${API_URL}/matches/compute`);
			summary = response.data.summary || {};
			matches = response.data.matches || [];
			unmatchedInvoices = response.data.unmatched?.invoices || [];
			unmatchedTransactions = response.data.unmatched?.transactions || [];
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	function formatDate(date) {
		return new Date(date).toLocaleDateString('fr-FR');
	}

	function formatAmount(amount) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount);
	}
</script>

<svelte:head>
	<title>Appairages — Validation</title>
</svelte:head>

<div class="space-y-6 p-6">
	<h1 class="text-4xl font-bold">Rapprochements Facture ↔ Transaction</h1>

	{#if loading}
		<p class="text-gray-600 animate-pulse">Chargement des données...</p>
	{:else if error}
		<div class="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
			<strong>Erreur:</strong> {error}
		</div>
	{:else}
		<!-- Summary Cards -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
			<div class="bg-blue-50 p-4 rounded border border-blue-200">
				<div class="text-2xl font-bold text-blue-700">{summary.total_invoices || 0}</div>
				<div class="text-sm text-gray-600">Factures</div>
			</div>
			<div class="bg-purple-50 p-4 rounded border border-purple-200">
				<div class="text-2xl font-bold text-purple-700">{summary.total_transactions || 0}</div>
				<div class="text-sm text-gray-600">Transactions</div>
			</div>
			<div class="bg-green-50 p-4 rounded border border-green-200">
				<div class="text-2xl font-bold text-green-700">{summary.matched_pairs || 0}</div>
				<div class="text-sm text-gray-600">Appairées ✓</div>
			</div>
			<div class="bg-orange-50 p-4 rounded border border-orange-200">
				<div class="text-2xl font-bold text-orange-700">{summary.unmatched_invoices || 0}</div>
				<div class="text-sm text-gray-600">Sans match (F)</div>
			</div>
			<div class="bg-red-50 p-4 rounded border border-red-200">
				<div class="text-2xl font-bold text-red-700">{summary.unmatched_transactions || 0}</div>
				<div class="text-sm text-gray-600">Sans match (T)</div>
			</div>
		</div>

		<!-- Matched Pairs Table -->
		<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
			<div class="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b">
				<h2 class="text-xl font-semibold text-green-900">
					✓ Appairages Détectés ({matches.length})
				</h2>
			</div>

			{#if matches.length > 0}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-50 border-b">
							<tr>
								<th class="text-left py-3 px-4">Facture</th>
								<th class="text-left py-3 px-4">Montant F</th>
								<th class="text-left py-3 px-4">Transaction</th>
								<th class="text-left py-3 px-4">Montant T</th>
								<th class="text-center py-3 px-4">Score</th>
								<th class="text-left py-3 px-4">Raison</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each matches as match}
								<tr class="hover:bg-green-50">
									<td class="py-3 px-4">
										<div class="font-semibold text-gray-900">{match.invoice?.vendor}</div>
										<div class="text-xs text-gray-500">{formatDate(match.invoice?.date)}</div>
									</td>
									<td class="py-3 px-4 font-mono font-semibold">{formatAmount(match.invoice?.amount)}</td>
									<td class="py-3 px-4">
										<div class="text-gray-700">{match.transaction?.description?.substring(0, 40)}</div>
										<div class="text-xs text-gray-500">{formatDate(match.transaction?.date)}</div>
									</td>
									<td class="py-3 px-4 font-mono font-semibold">{formatAmount(match.transaction?.amount)}</td>
									<td class="py-3 px-4 text-center">
										<span class="inline-block bg-green-200 text-green-900 font-bold px-3 py-1 rounded-full text-sm">
											{(match.confidence * 100).toFixed(0)}%
										</span>
									</td>
									<td class="py-3 px-4 text-xs text-gray-600">{match.reason}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="p-6 text-center text-gray-600">
					Aucun appairage détecté
				</div>
			{/if}
		</div>

		<!-- Unmatched Invoices -->
		{#if unmatchedInvoices.length > 0}
			<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
				<div class="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b">
					<h2 class="text-xl font-semibold text-orange-900">
						⚠️ Factures Sans Match ({unmatchedInvoices.length})
					</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-50 border-b">
							<tr>
								<th class="text-left py-3 px-4">Fournisseur</th>
								<th class="text-left py-3 px-4">Date</th>
								<th class="text-right py-3 px-4">Montant</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each unmatchedInvoices.slice(0, 20) as inv}
								<tr class="hover:bg-orange-50">
									<td class="py-3 px-4 font-semibold">{inv.vendor}</td>
									<td class="py-3 px-4 text-gray-600">{formatDate(inv.date)}</td>
									<td class="py-3 px-4 text-right font-mono font-semibold">{formatAmount(inv.amount)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if unmatchedInvoices.length > 20}
					<div class="p-4 text-center text-gray-600 text-sm">
						... et {unmatchedInvoices.length - 20} autres
					</div>
				{/if}
			</div>
		{/if}

		<!-- Unmatched Transactions -->
		{#if unmatchedTransactions.length > 0}
			<div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
				<div class="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b">
					<h2 class="text-xl font-semibold text-red-900">
						❌ Transactions Non Justifiées ({unmatchedTransactions.length})
					</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-50 border-b">
							<tr>
								<th class="text-left py-3 px-4">Description</th>
								<th class="text-left py-3 px-4">Date</th>
								<th class="text-right py-3 px-4">Montant</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each unmatchedTransactions.slice(0, 20) as txn}
								<tr class="hover:bg-red-50">
									<td class="py-3 px-4">{txn.description?.substring(0, 50)}</td>
									<td class="py-3 px-4 text-gray-600">{formatDate(txn.date)}</td>
									<td class="py-3 px-4 text-right font-mono font-semibold">{formatAmount(txn.amount)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if unmatchedTransactions.length > 20}
					<div class="p-4 text-center text-gray-600 text-sm">
						... et {unmatchedTransactions.length - 20} autres
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	:global(body) {
		@apply bg-gray-100;
	}
</style>
